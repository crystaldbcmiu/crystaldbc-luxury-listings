import useAuth from "@/hooks/useAuth";
import { STAFF_ROLES } from "@/components/RoleGate";
import type { Role } from "@/types";

/** Role helpers matching the gates in client/src/App.tsx. */
export const useRoles = () => {
  const { user, isAuthenticated } = useAuth();
  const role = user?.role;

  const has = (...roles: Role[]) => Boolean(role && roles.includes(role));

  return {
    role,
    isAuthenticated,
    isStaff: Boolean(role && STAFF_ROLES.includes(role)),
    isAdmin: has("admin"),
    isEmployee: has("employee"),
    isPropertyHandler: has("property-handler"),
    isInvestor: has("investor"),
    isUser: has("user"),
    has,
  };
};

export default useRoles;
