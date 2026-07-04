// Type declaration for vditor
declare module "vditor" {
  interface IOptions {
    mode?: "wysiwyg" | "ir" | "sv";
    height?: number | string;
    minHeight?: number;
    width?: number | string;
    placeholder?: string;
    theme?: "classic" | "dark";
    icon?: "ant" | "material";
    toolbar?: string[] | object[];
    cache?: { enable?: boolean; id?: string };
    counter?: { enable?: boolean; max?: number };
    typewriterMode?: boolean;
    preview?: { delay?: number; maxWidth?: number; mode?: "both" | "editor" | "preview" };
    resize?: { enable?: boolean; position?: "top" | "bottom" | "none" };
    lang?: string;
    after?: () => void;
    input?: (value: string) => void;
    blur?: (value: string) => void;
    focus?: (value: string) => void;
    select?: (value: string) => void;
    esc?: (value: string) => void;
    ctrlEnter?: (value: string) => void;
  }

  class Vditor {
    constructor(id: string | HTMLElement, options?: IOptions);
    vditor: { options: IOptions };
    getValue(): string;
    setValue(value: string, clearStack?: boolean): void;
    setTheme(theme: "dark" | "classic"): void;
    disabled(): void;
    enable(): void;
    focus(): void;
    blur(): void;
    destroy(): void;
    getHTML(): string;
    insertValue(value: string, render?: boolean): void;
  }

  export default Vditor;
}
