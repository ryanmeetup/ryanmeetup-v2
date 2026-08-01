import { NavMenu } from "@ryanmeetup/ui";
import type { NavRoute } from "@ryanmeetup/ui";
import type { ReactNode } from "react";

type RouteMenuProps = {
  icon: ReactNode;
  title: string;
  routes: NavRoute[];
  pathname: string;
};
const RouteMenu = (props: RouteMenuProps) => <NavMenu {...props} />;

export { RouteMenu };
