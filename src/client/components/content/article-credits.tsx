export function ArticleCredits({ text }: { text: string }) {
  if (text.trim() === '') return null;
  return <p className="text-xs leading-5 text-muted-foreground">{text}</p>;
}
