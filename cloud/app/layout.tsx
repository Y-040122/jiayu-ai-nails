import type { Metadata } from 'next';
export const metadata:Metadata={title:'甲遇 · 邀请体验',description:'AI 美甲选款、试戴与预约体验'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body style={{margin:0}}>{children}</body></html>}
