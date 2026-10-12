import { URLS } from "../../_config";

function TipLink() {
  return (
    <a
      className="text-xs underline text-gray-500 text-right"
      href={URLS.tips}
      target="_blank"
      rel="noopener"
    >
      Tips for better results
    </a>
  );
}

export default TipLink;
