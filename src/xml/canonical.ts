/**
 * Exclusive XML Canonicalisation 1.0 (`http://www.w3.org/2001/10/xml-exc-c14n#`).
 *
 * Implements the subset of W3C exclusive C14N required by XAdES-BES on the
 * non-VERI*FACTU path. Only the features actually used by the AEAT signing
 * profile are implemented; namely:
 *
 * - UTF-8 output, no BOM.
 * - Sorted attributes (by namespace URI, then local name).
 * - Lexicographically sorted namespace declarations.
 * - Inclusion of only the namespace prefixes "visibly used" by the subtree,
 *   plus the ones listed in {@link CanonicaliseOptions.inclusiveNamespaces}.
 * - Escape of `<`, `>`, `&`, `\r`, `"` (attributes) per the spec.
 * - Empty elements expanded as `<x></x>`, never `<x/>`.
 *
 * @module
 */

import { DOMParser } from '@xmldom/xmldom';

/**
 * Options for {@link canonicaliseElement}.
 */
export interface CanonicaliseOptions {
  /**
   * Prefixes to treat as "inclusive" — declared even when the local subtree
   * does not visibly use them. Used by the SignedInfo InclusiveNamespaces
   * PrefixList element when XAdES instructs the signer to keep specific
   * outer namespaces alive in the canonical form.
   */
  inclusiveNamespaces?: readonly string[];
}

const XML_NS_URI = 'http://www.w3.org/XML/1998/namespace';
const XMLNS_URI = 'http://www.w3.org/2000/xmlns/';

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const CDATA_NODE = 4;
const COMMENT_NODE = 8;
const DOCUMENT_NODE = 9;

interface MinimalNode {
  nodeType: number;
  nodeName?: string;
  localName?: string;
  namespaceURI?: string | null;
  prefix?: string | null;
  nodeValue?: string | null;
  data?: string;
  childNodes?: ArrayLike<MinimalNode>;
  parentNode?: MinimalNode | null;
  attributes?: ArrayLike<MinimalNode>;
  ownerDocument?: { documentElement?: MinimalNode } | null;
  documentElement?: MinimalNode;
}

/**
 * Convert a DOM element (or document) to its exclusive canonical form.
 *
 * @param node - The element or document to canonicalise. When a document is
 *   passed the canonical form covers the document element.
 * @param options - Optional behaviour tweaks; see {@link CanonicaliseOptions}.
 * @returns The canonical UTF-8 byte sequence as a string (the caller is
 *   responsible for encoding it as `Buffer.from(value, 'utf8')` when needed).
 * @throws {Error} If {@link node} is `null`/`undefined` or not an element.
 * @example
 * ```ts
 * import { DOMParser } from '@xmldom/xmldom';
 * const doc = new DOMParser().parseFromString('<a xmlns="urn:x"><b/></a>', 'text/xml');
 * canonicaliseElement(doc.documentElement);
 * // → '<a xmlns="urn:x"><b></b></a>'
 * ```
 * @see {@link https://www.w3.org/TR/xml-exc-c14n/ | W3C exclusive XML C14N spec}
 */
export function canonicaliseElement(node: unknown, options: CanonicaliseOptions = {}): string {
  if (node === null || node === undefined) {
    throw new Error('canonicaliseElement: node is required');
  }
  const start = resolveElement(node as MinimalNode);
  const sink: string[] = [];
  const ancestorNs: NamespaceContext = { rendered: new Map() };
  serialiseElement(start, sink, ancestorNs, new Set(options.inclusiveNamespaces ?? []));
  return sink.join('');
}

/**
 * Parse the given UTF-8 XML string and canonicalise the document element.
 *
 * A convenience wrapper around {@link canonicaliseElement} for callers that
 * already have the XML serialised as bytes.
 *
 * @param xml - The XML payload to canonicalise.
 * @param options - See {@link CanonicaliseOptions}.
 * @returns The canonical form of the document element.
 */
export function canonicaliseXml(xml: string, options: CanonicaliseOptions = {}): string {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  return canonicaliseElement(doc, options);
}

function resolveElement(input: MinimalNode): MinimalNode {
  if (input.nodeType === DOCUMENT_NODE) {
    const docEl = input.documentElement ?? input.ownerDocument?.documentElement;
    if (!docEl) {
      throw new Error('canonicaliseElement: document has no documentElement');
    }
    return docEl;
  }
  if (input.nodeType !== ELEMENT_NODE) {
    throw new Error('canonicaliseElement: node must be an element or document');
  }
  return input;
}

interface NamespaceContext {
  rendered: Map<string, string>;
}

/**
 * Serialise a single element using the exclusive C14N rules.
 */
function serialiseElement(
  element: MinimalNode,
  sink: string[],
  ancestorNs: NamespaceContext,
  inclusivePrefixes: ReadonlySet<string>,
): void {
  const qname = qualifiedName(element);
  sink.push('<', qname);

  const attrs = collectAttributes(element);
  const visiblyUsedPrefixes = computeVisiblyUsedPrefixes(element, attrs);
  for (const prefix of inclusivePrefixes) {
    visiblyUsedPrefixes.add(prefix);
  }

  const namespaceDecls = renderNamespaces(element, ancestorNs, visiblyUsedPrefixes);
  for (const decl of namespaceDecls) {
    sink.push(' ', decl.name, '="', escapeAttribute(decl.value), '"');
  }

  for (const attr of attrs.sorted) {
    sink.push(' ', qualifiedAttributeName(attr), '="', escapeAttribute(attr.nodeValue ?? ''), '"');
  }

  sink.push('>');

  const childNs: NamespaceContext = {
    rendered: new Map(ancestorNs.rendered),
  };
  for (const decl of namespaceDecls) {
    const prefix = decl.name === 'xmlns' ? '' : decl.name.slice(6); // strip 'xmlns:'
    childNs.rendered.set(prefix, decl.value);
  }

  const children = element.childNodes ?? [];
  for (let i = 0; i < children.length; i += 1) {
    const child = children[i] as MinimalNode | undefined;
    if (!child) {
      continue;
    }
    serialiseChild(child, sink, childNs, inclusivePrefixes);
  }

  sink.push('</', qname, '>');
}

interface CollectedAttributes {
  sorted: MinimalNode[];
  declaredPrefixes: Map<string, string>;
}

/**
 * Collect non-namespace attributes (sorted) and the set of namespace
 * declarations that appear directly on the element.
 */
function collectAttributes(element: MinimalNode): CollectedAttributes {
  const attrs = element.attributes ?? [];
  const regular: MinimalNode[] = [];
  const declared = new Map<string, string>();
  for (let i = 0; i < attrs.length; i += 1) {
    const attr = attrs[i] as MinimalNode | undefined;
    if (!attr) {
      continue;
    }
    const nsUri = attr.namespaceURI ?? null;
    if (nsUri === XMLNS_URI || attr.nodeName === 'xmlns' || attr.nodeName?.startsWith('xmlns:')) {
      const prefix = attr.nodeName === 'xmlns' ? '' : (attr.localName ?? '');
      declared.set(prefix, attr.nodeValue ?? '');
      continue;
    }
    regular.push(attr);
  }
  regular.sort(compareAttributes);
  return { sorted: regular, declaredPrefixes: declared };
}

function compareAttributes(a: MinimalNode, b: MinimalNode): number {
  const aNs = a.namespaceURI ?? '';
  const bNs = b.namespaceURI ?? '';
  if (aNs === bNs) {
    return (a.localName ?? a.nodeName ?? '').localeCompare(b.localName ?? b.nodeName ?? '');
  }
  if (aNs === '') {
    return -1;
  }
  if (bNs === '') {
    return 1;
  }
  return aNs.localeCompare(bNs);
}

function computeVisiblyUsedPrefixes(element: MinimalNode, attrs: CollectedAttributes): Set<string> {
  const used = new Set<string>();
  used.add(element.prefix ?? '');
  for (const attr of attrs.sorted) {
    if (attr.prefix !== null && attr.prefix !== undefined && attr.prefix !== '') {
      used.add(attr.prefix);
    }
  }
  return used;
}

interface NamespaceDeclaration {
  name: string;
  value: string;
}

function renderNamespaces(
  element: MinimalNode,
  ancestorNs: NamespaceContext,
  visiblyUsed: ReadonlySet<string>,
): NamespaceDeclaration[] {
  const declarations: NamespaceDeclaration[] = [];
  const localPrefixes = new Map<string, string>();
  const localAttrs = element.attributes ?? [];
  for (let i = 0; i < localAttrs.length; i += 1) {
    const attr = localAttrs[i] as MinimalNode | undefined;
    if (!attr) {
      continue;
    }
    if (attr.nodeName === 'xmlns') {
      localPrefixes.set('', attr.nodeValue ?? '');
    } else if (attr.nodeName?.startsWith('xmlns:')) {
      localPrefixes.set(attr.nodeName.slice(6), attr.nodeValue ?? '');
    }
  }

  const elementPrefix = element.prefix ?? '';
  const elementNs = element.namespaceURI ?? '';
  const candidatePrefixes = new Set<string>([elementPrefix, ...visiblyUsed]);
  for (const prefix of candidatePrefixes) {
    if (prefix === 'xml') {
      continue;
    }
    const uri =
      prefix === elementPrefix
        ? elementNs
        : (localPrefixes.get(prefix) ?? lookupAncestorPrefix(element, prefix));
    if (uri === undefined) {
      continue;
    }
    if (ancestorNs.rendered.get(prefix) === uri) {
      continue;
    }
    if (prefix === '' && uri === '' && ancestorNs.rendered.get('') === undefined) {
      continue;
    }
    declarations.push({
      name: prefix === '' ? 'xmlns' : `xmlns:${prefix}`,
      value: uri,
    });
  }

  declarations.sort((a, b) => {
    if (a.name === 'xmlns' && b.name !== 'xmlns') {
      return -1;
    }
    if (b.name === 'xmlns' && a.name !== 'xmlns') {
      return 1;
    }
    return a.name.localeCompare(b.name);
  });

  return declarations;
}

function lookupAncestorPrefix(element: MinimalNode, prefix: string): string | undefined {
  let current = element.parentNode ?? null;
  while (current && current.nodeType === ELEMENT_NODE) {
    const attrs = current.attributes ?? [];
    for (let i = 0; i < attrs.length; i += 1) {
      const attr = attrs[i] as MinimalNode | undefined;
      if (!attr) {
        continue;
      }
      if (prefix === '' && attr.nodeName === 'xmlns') {
        return attr.nodeValue ?? '';
      }
      if (prefix !== '' && attr.nodeName === `xmlns:${prefix}`) {
        return attr.nodeValue ?? '';
      }
    }
    current = current.parentNode ?? null;
  }
  return undefined;
}

function serialiseChild(
  child: MinimalNode,
  sink: string[],
  ancestorNs: NamespaceContext,
  inclusivePrefixes: ReadonlySet<string>,
): void {
  switch (child.nodeType) {
    case ELEMENT_NODE:
      serialiseElement(child, sink, ancestorNs, inclusivePrefixes);
      break;
    case TEXT_NODE:
    case CDATA_NODE:
      sink.push(escapeText(child.data ?? child.nodeValue ?? ''));
      break;
    case COMMENT_NODE:
      // Exclusive C14N WithoutComments — comments are intentionally dropped.
      break;
    default:
      break;
  }
}

function qualifiedName(node: MinimalNode): string {
  if (node.prefix !== null && node.prefix !== undefined && node.prefix !== '') {
    return `${node.prefix}:${node.localName ?? node.nodeName ?? ''}`;
  }
  return node.localName ?? node.nodeName ?? '';
}

function qualifiedAttributeName(attr: MinimalNode): string {
  if (attr.namespaceURI === XML_NS_URI) {
    return `xml:${attr.localName ?? attr.nodeName?.replace(/^xml:/u, '') ?? ''}`;
  }
  if (attr.prefix !== null && attr.prefix !== undefined && attr.prefix !== '') {
    return `${attr.prefix}:${attr.localName ?? attr.nodeName ?? ''}`;
  }
  return attr.localName ?? attr.nodeName ?? '';
}

function escapeText(value: string): string {
  return value.replace(/[&<>\r]/gu, (ch) => {
    switch (ch) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '\r':
        return '&#xD;';
      default:
        return ch;
    }
  });
}

function escapeAttribute(value: string): string {
  return value.replace(/[&<"\r\n\t]/gu, (ch) => {
    switch (ch) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '"':
        return '&quot;';
      case '\r':
        return '&#xD;';
      case '\n':
        return '&#xA;';
      case '\t':
        return '&#x9;';
      default:
        return ch;
    }
  });
}

/** Re-export so the signer can construct nodes via the canonicaliser's parser. */
export { DOMParser };
