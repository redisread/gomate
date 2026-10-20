import type { TranslationKey } from "@/i18n";

type MetadataKey = Extract<TranslationKey, `content.${string}`>;

export interface PageMetadataProps {
  /** Dynamic title text; receives the localized site suffix. */
  title?: string;
  /** Static translated title; already includes any desired branding. */
  titleKey?: MetadataKey;
  description?: string;
  descriptionKey?: MetadataKey;
}

export function resolvePageMetadata(
  props: PageMetadataProps,
  translate: (key: TranslationKey) => string,
) {
  return {
    title: props.titleKey
      ? translate(props.titleKey)
      : props.title !== undefined
        ? `${props.title}${translate("content.titleSuffix")}`
        : translate("content.title"),
    description: props.descriptionKey
      ? translate(props.descriptionKey)
      : (props.description ?? translate("content.description")),
  };
}
