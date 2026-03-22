import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "图片压缩 - 免费在线图片压缩工具",
  description:
    "免费在线图片压缩工具，支持 JPEG、WebP、PNG 格式，纯浏览器端处理，保护你的隐私。支持批量压缩、拖拽上传、实时预览。",
  keywords: "图片压缩,图片瘦身,在线压缩,JPEG压缩,WebP压缩,PNG压缩",
  openGraph: {
    title: "图片压缩 - 免费在线图片压缩工具",
    description: "免费在线图片压缩，纯浏览器端处理，隐私安全，支持批量操作",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
