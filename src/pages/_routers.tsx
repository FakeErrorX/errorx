import LogsPage from "./logs";
import ProxiesPage from "./proxies";
import ProfilesPage from "./profiles";
import SettingsPage from "./settings";
import ConnectionsPage from "./connections";
import RulesPage from "./rules";
import HomePage from "./home";
import UnlockPage from "./unlock";
import LoginPage from "./login";
import { BaseErrorBoundary } from "@/components/base";
import { Navigate } from "react-router-dom";

import HomeSvg from "@/assets/image/itemicon/home.svg?react";
import ProxiesSvg from "@/assets/image/itemicon/proxies.svg?react";
import ProfilesSvg from "@/assets/image/itemicon/profiles.svg?react";
import ConnectionsSvg from "@/assets/image/itemicon/connections.svg?react";
import RulesSvg from "@/assets/image/itemicon/rules.svg?react";
import LogsSvg from "@/assets/image/itemicon/logs.svg?react";
import UnlockSvg from "@/assets/image/itemicon/unlock.svg?react";
import SettingsSvg from "@/assets/image/itemicon/settings.svg?react";

import WifiRoundedIcon from "@mui/icons-material/WifiRounded";
import DnsRoundedIcon from "@mui/icons-material/DnsRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import ForkRightRoundedIcon from "@mui/icons-material/ForkRightRounded";
import SubjectRoundedIcon from "@mui/icons-material/SubjectRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import LockOpenRoundedIcon from "@mui/icons-material/LockOpenRounded";

// Authentication guard component
const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return children;
};

export const routers = [
  {
    label: "Label-Login",
    path: "/login",
    element: <LoginPage />,
  },
  {
    label: "Label-Home",
    path: "/home",
    icon: [<HomeRoundedIcon />, <HomeSvg />],
    element: <RequireAuth><HomePage /></RequireAuth>,
  },
  {
    label: "Label-Proxies",
    path: "/",
    icon: [<WifiRoundedIcon />, <ProxiesSvg />],
    element: <RequireAuth><ProxiesPage /></RequireAuth>,
  },
  {
    label: "Label-Profiles",
    path: "/profile",
    icon: [<DnsRoundedIcon />, <ProfilesSvg />],
    element: <RequireAuth><ProfilesPage /></RequireAuth>,
  },
  {
    label: "Label-Connections",
    path: "/connections",
    icon: [<LanguageRoundedIcon />, <ConnectionsSvg />],
    element: <RequireAuth><ConnectionsPage /></RequireAuth>,
  },
  {
    label: "Label-Rules",
    path: "/rules",
    icon: [<ForkRightRoundedIcon />, <RulesSvg />],
    element: <RequireAuth><RulesPage /></RequireAuth>,
  },
  {
    label: "Label-Logs",
    path: "/logs",
    icon: [<SubjectRoundedIcon />, <LogsSvg />],
    element: <RequireAuth><LogsPage /></RequireAuth>,
  },
  {
    label: "Label-Unlock",
    path: "/unlock",
    icon: [<LockOpenRoundedIcon />, <UnlockSvg />],
    element: <RequireAuth><UnlockPage /></RequireAuth>,
  },
  {
    label: "Label-Settings",
    path: "/settings",
    icon: [<SettingsRoundedIcon />, <SettingsSvg />],
    element: <RequireAuth><SettingsPage /></RequireAuth>,
  },
].map((router) => ({
  ...router,
  element: (
    <BaseErrorBoundary key={router.label}>{router.element}</BaseErrorBoundary>
  ),
}));
