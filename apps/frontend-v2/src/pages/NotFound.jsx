import { Empty, ButtonLink } from "../components/ui";
import { useDocumentTitle } from "../lib/hooks";

export default function NotFound({ title = "Page not found", children = "That page doesn't exist." }) {
  useDocumentTitle(title);
  return (
    <div className="container page">
      <Empty icon="alert" title={title} action={<ButtonLink to="/">Go home</ButtonLink>}>
        {children}
      </Empty>
    </div>
  );
}
