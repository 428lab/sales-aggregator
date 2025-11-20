"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Package, Store, FileInput, BarChart3 } from "lucide-react";

const menuItems = [
  {
    title: "アイテム管理",
    url: "/items",
    icon: Package,
  },
  {
    title: "販路管理",
    url: "/channels",
    icon: Store,
  },
  {
    title: "売上数入力",
    url: "/sales",
    icon: FileInput,
  },
  {
    title: "売上集計",
    url: "/analytics",
    icon: BarChart3,
  },
];
export default function AppSidebar() {
  const location = usePathname();
  return (
    <Sidebar>
      <SidebarHeader className="p-6">
        <h1 className="text-lg font-bold">販売集計システム</h1>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>メニュー</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-${item.url.slice(1)}`}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
