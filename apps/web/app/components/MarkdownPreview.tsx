interface MarkdownPreviewProps {
  content: string;
}

function renderLine(line: string, index: number) {
  if (line.startsWith('### ')) return <h3 key={index}>{line.slice(4)}</h3>;
  if (line.startsWith('## ')) return <h2 key={index}>{line.slice(3)}</h2>;
  if (line.startsWith('# ')) return <h1 key={index}>{line.slice(2)}</h1>;
  if (line.startsWith('> ')) return <blockquote key={index}>{line.slice(2)}</blockquote>;
  if (line.startsWith('- ')) return <div key={index}>• {line.slice(2)}</div>;
  return <div key={index}>{line || '\u00a0'}</div>;
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  return <div className="preview" aria-label="Vista previa de la nota">{content ? content.split('\n').map(renderLine) : <span className="muted">La vista previa aparecerá aquí.</span>}</div>;
}
