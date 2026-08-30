import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

type CardLoadingWrapperProps = {
  title: string;
  description: string;
  className?: string;
};

export function CardLoadingWrapper({
  title,
  description,
  className,
}: Readonly<CardLoadingWrapperProps>) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent />
    </Card>
  );
}
