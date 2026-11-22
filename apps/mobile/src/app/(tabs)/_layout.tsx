import { NativeTabs } from "expo-router/native-tabs";
import { useTheme } from "@/constants/theme";

export default function TabsLayout() {
  const t = useTheme();
  return (
    <NativeTabs backgroundColor={t.card} labelStyle={{ selected: { color: t.primary } }} iconColor={{ selected: t.primary }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Plan</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={require("@/assets/images/tabIcons/plan.png")} renderingMode="template" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="courses">
        <NativeTabs.Trigger.Label>Courses</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={require("@/assets/images/tabIcons/courses.png")} renderingMode="template" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="week">
        <NativeTabs.Trigger.Label>My week</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={require("@/assets/images/tabIcons/week.png")} renderingMode="template" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={require("@/assets/images/tabIcons/account.png")} renderingMode="template" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
