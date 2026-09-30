export function parseContentSections(content: string): { type: string; content: string }[] {
  const sections: { type: string; content: string }[] = [];
  let current: { type: string; content: string } | null = null;
  const flush = () => { if (current) sections.push({ ...current, content: current.content.trim() }); current = null; };
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    const callout = /^\[(INFO|TIP|AVOID)\]\s*(.*)$/.exec(line);
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (callout) { flush(); sections.push({ type: callout[1].toLowerCase(), content: callout[2] }); }
    else if (heading) { flush(); sections.push({ type: `h${heading[1].length}`, content: heading[2] }); }
    else if (line.startsWith('- ')) {
      if (current?.type !== 'list') { flush(); current = { type: 'list', content: '' }; }
      current.content += `${current.content ? '\n' : ''}• ${line.slice(2)}`;
    } else {
      if (current?.type !== 'paragraph') { flush(); current = { type: 'paragraph', content: '' }; }
      current.content += `${current.content ? ' ' : ''}${line}`;
    }
  }
  flush();
  return sections;
}
