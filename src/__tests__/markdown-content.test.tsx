 import { describe, it, expect } from "vitest";
 import { render, screen } from "@testing-library/react";
 import { MarkdownContent } from "../components/features/discover/markdown-content";

 describe("MarkdownContent", () => {
   describe("基础渲染", () => {
     it("渲染段落", () => {
       render(<MarkdownContent content="这是一段测试文本" />);
       expect(screen.getByText("这是一段测试文本")).toBeInTheDocument();
     });

     it("空内容返回 null", () => {
       const { container } = render(<MarkdownContent content="" />);
       expect(container.firstChild).toBeNull();
     });

     it("undefined 内容返回 null", () => {
       const { container } = render(<MarkdownContent content={undefined as unknown as string} />);
       expect(container.firstChild).toBeNull();
     });
   });

   describe("标题", () => {
     it("渲染 h1 标题", () => {
       render(<MarkdownContent content="# 一级标题" />);
       const heading = screen.getByRole("heading", { level: 1 });
       expect(heading).toHaveTextContent("一级标题");
     });

     it("渲染 h2 标题", () => {
       render(<MarkdownContent content="## 二级标题" />);
       const heading = screen.getByRole("heading", { level: 2 });
       expect(heading).toHaveTextContent("二级标题");
     });

     it("渲染 h3 标题", () => {
       render(<MarkdownContent content="### 三级标题" />);
       const heading = screen.getByRole("heading", { level: 3 });
       expect(heading).toHaveTextContent("三级标题");
     });

    it("支持将标题层级整体下移一级", () => {
      render(<MarkdownContent content={`# 一级标题
## 二级标题
### 三级标题`} headingOffset={1} />);

      expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("一级标题");
      expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("二级标题");
      expect(screen.getByRole("heading", { level: 4 })).toHaveTextContent("三级标题");
    });

    it("渲染 h4-h6 标题", () => {
      const { container } = render(
        <MarkdownContent content={`#### 四级标题
##### 五级标题
###### 六级标题`} />
      );
      expect(container.querySelector("h4")).toHaveTextContent("四级标题");
      expect(container.querySelector("h5")).toHaveTextContent("五级标题");
      expect(container.querySelector("h6")).toHaveTextContent("六级标题");
    });
   });

   describe("文本格式", () => {
     it("渲染粗体", () => {
       render(<MarkdownContent content="这是**粗体**文本" />);
       const strong = screen.getByText("粗体");
       expect(strong.tagName).toBe("STRONG");
     });

     it("渲染斜体", () => {
       render(<MarkdownContent content="这是*斜体*文本" />);
       const em = screen.getByText("斜体");
       expect(em.tagName).toBe("EM");
     });

     it("渲染删除线", () => {
       render(<MarkdownContent content="这是~~删除线~~文本" />);
       const del = screen.getByText("删除线");
       expect(del.tagName).toBe("DEL");
     });
   });

   describe("链接", () => {
     it("渲染链接并添加 target 和 rel 属性", () => {
       render(<MarkdownContent content="[测试链接](https://example.com)" />);
       const link = screen.getByRole("link", { name: "测试链接" });
       expect(link).toHaveAttribute("href", "https://example.com");
       expect(link).toHaveAttribute("target", "_blank");
       expect(link).toHaveAttribute("rel", "noopener noreferrer nofollow");
     });

     it("渲染自动链接", () => {
       render(<MarkdownContent content="https://example.com" />);
       const link = screen.getByRole("link", { name: "https://example.com" });
       expect(link).toHaveAttribute("href", "https://example.com");
     });
   });

   describe("列表", () => {
    it("渲染无序列表", () => {
      const { container } = render(
        <MarkdownContent content={`- 项目一
- 项目二
- 项目三`} />
      );
      const ul = container.querySelector("ul");
      expect(ul).toBeInTheDocument();
       const items = ul?.querySelectorAll("li");
       expect(items).toHaveLength(3);
       expect(items?.[0]).toHaveTextContent("项目一");
     });

    it("渲染有序列表", () => {
      const { container } = render(
        <MarkdownContent content={`1. 第一项
2. 第二项
3. 第三项`} />
      );
      const ol = container.querySelector("ol");
      expect(ol).toBeInTheDocument();
       const items = ol?.querySelectorAll("li");
       expect(items).toHaveLength(3);
       expect(items?.[0]).toHaveTextContent("第一项");
     });

    it("渲染嵌套列表", () => {
      const { container } = render(
        <MarkdownContent content={`- 外层一
  - 内层一
  - 内层二
- 外层二`} />
      );
      const outerUl = container.querySelector("ul");
      expect(outerUl).toBeInTheDocument();
       const innerUl = outerUl?.querySelector("ul");
       expect(innerUl).toBeInTheDocument();
       const innerItems = innerUl?.querySelectorAll("li");
       expect(innerItems).toHaveLength(2);
     });
   });

   describe("代码", () => {
     it("渲染行内代码", () => {
       render(<MarkdownContent content="这是`行内代码`文本" />);
       const code = screen.getByText("行内代码");
       expect(code.tagName).toBe("CODE");
     });

    it("渲染代码块", () => {
      const { container } = render(
        <MarkdownContent content={`\`\`\`javascript
const x = 1;
console.log(x);
\`\`\``} />
      );
      const pre = container.querySelector("pre");
      expect(pre).toBeInTheDocument();
       const code = pre?.querySelector("code");
      expect(code).toBeInTheDocument();
      expect(code?.textContent).toContain("const x = 1;");
      expect(code?.textContent).toContain("console.log(x);");
     });

    it("代码块内的特殊字符不被转义", () => {
      const { container } = render(
        <MarkdownContent content={`\`\`\`
<div>test</div>
\`\`\``} />
      );
      const code = container.querySelector("code");
      expect(code).toHaveTextContent("<div>test</div>");
     });
   });

   describe("GFM 扩展语法", () => {
     it("渲染表格", () => {
       const markdown = `| 列一 | 列二 |
 | ---- | ---- |
 | 值一 | 值二 |`;
       const { container } = render(<MarkdownContent content={markdown} />);
       const table = container.querySelector("table");
       expect(table).toBeInTheDocument();
       const ths = table?.querySelectorAll("th");
       expect(ths).toHaveLength(2);
       expect(ths?.[0]).toHaveTextContent("列一");
       expect(ths?.[1]).toHaveTextContent("列二");
       const tds = table?.querySelectorAll("td");
       expect(tds).toHaveLength(2);
       expect(tds?.[0]).toHaveTextContent("值一");
     });

    it("渲染任务列表", () => {
      const { container } = render(
        <MarkdownContent content={`- [ ] 未完成任务
- [x] 已完成任务`} />
      );
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes).toHaveLength(2);
       expect(checkboxes[0]).not.toBeChecked();
       expect(checkboxes[1]).toBeChecked();
     });
   });

   describe("XSS 防御", () => {
     it("不渲染 script 标签", () => {
       const { container } = render(
         <MarkdownContent content='<script>alert("XSS")</script>' />
       );
       const script = container.querySelector("script");
       expect(script).toBeNull();
     });

     it("不渲染 HTML 标签", () => {
       const { container } = render(
         <MarkdownContent content='<div onclick="alert(1)">点击我</div>' />
       );
       const div = container.querySelector("div[onclick]");
       expect(div).toBeNull();
     });

    it("转义特殊字符", () => {
      const { container } = render(<MarkdownContent content="这是 <div> 标签" />);
      // react-markdown 默认剥离 HTML 标签，<div> 不会渲染为 DOM 元素
      const div = container.querySelector("div.prose-content > div");
      expect(div).toBeNull();
    });
  });

  describe("样式类名", () => {
    it("添加 prose-content 类名", () => {
      const { container } = render(<MarkdownContent content="测试" />);
      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper).toHaveClass("prose-content");
    });

    it("支持自定义类名", () => {
      const { container } = render(
        <MarkdownContent content="测试" className="custom-class" />
      );
      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper).toHaveClass("prose-content");
      expect(wrapper).toHaveClass("custom-class");
    });
  });
 });
