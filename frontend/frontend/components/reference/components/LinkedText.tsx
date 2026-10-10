export default function LinkedText({
  children,
}: {
  children: string;
}) {
  const parts = children.split(/(https?:\/\/[^\s<>()\]]+)/gi);

  return (
    <>
      {parts.map((part, index) =>
        /^https?:\/\//i.test(part) ? (
          <a
            key={`${index}-${part}`}
            href={part.replace(/[.,;:]+$/, "")}
            target="_blank"
            rel="noopener noreferrer"
            className="text-info underline decoration-info/40 underline-offset-2 hover:decoration-info"
          >
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </>
  );
}
