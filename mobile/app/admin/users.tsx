import { useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Badge, Button, Card, Input, Muted, Text } from "@/components/ui/Themed";
import Glyph from "@/components/ui/Glyph";
import { Select } from "@/components/ui/Select";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import { useToast } from "@/components/ToastProvider";
import useAuth from "@/hooks/useAuth";
import apiClient, { getApiErrorMessage } from "@/lib/apiClient";
import { formatDate, initialsOf } from "@/lib/format";
import { colors } from "@/lib/theme";
import type { Role, User } from "@/types";

const ROLE_OPTIONS: { label: string; value: Role }[] = [
  { label: "Admin", value: "admin" },
  { label: "Employee", value: "employee" },
  { label: "Property handler", value: "property-handler" },
  { label: "Investor", value: "investor" },
  { label: "User", value: "user" },
  { label: "Guest", value: "guest" },
];

const ROLE_COLORS: Record<string, string> = {
  admin: colors.gold,
  employee: colors.success,
  "property-handler": colors.warning,
  investor: colors.goldLight,
};

const emptyForm = { name: "", email: "", password: "", phone: "", country: "", role: "user" as Role };

export default function AdminUsersScreen() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: users = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ users: User[] }>("/users");
      return data.users;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        country: form.country || undefined,
        role: form.role,
      };
      // Only send a password when one was typed, so edits don't wipe it.
      if (form.password.trim()) payload.password = form.password;

      if (editingId) return apiClient.put(`/users/${editingId}`, payload);
      return apiClient.post("/users", payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: editingId ? t("admin.users.updated", "User updated") : t("admin.users.created", "User created"),
        variant: "success",
      });
      closeForm();
    },
    onError: (mutationError) =>
      toast({
        title: t("admin.users.saveFailed", "Save failed"),
        description: getApiErrorMessage(mutationError),
        variant: "error",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/users/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: t("admin.users.removed", "User removed"), variant: "success" });
    },
    onError: (mutationError) =>
      toast({
        title: t("admin.users.deleteFailed", "Delete failed"),
        description: getApiErrorMessage(mutationError),
        variant: "error",
      }),
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((item) => {
      const matchesRole = roleFilter === "all" || item.role === roleFilter;
      const matchesTerm =
        !term || item.name.toLowerCase().includes(term) || item.email.toLowerCase().includes(term);
      return matchesRole && matchesTerm;
    });
  }, [users, search, roleFilter]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (item: User) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      email: item.email,
      password: "",
      phone: item.phone ?? "",
      country: item.country ?? "",
      role: item.role,
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const confirmDelete = (item: User) => {
    if (item.id === currentUser?.id) {
      toast({ title: t("admin.users.cannotDeleteSelf", "You cannot delete your own account."), variant: "error" });
      return;
    }
    Alert.alert(t("admin.users.deleteTitle", "Delete user"), `${item.name} (${item.email})`, [
      { text: t("common.cancel", "Cancel"), style: "cancel" },
      { text: t("common.delete", "Delete"), style: "destructive", onPress: () => deleteMutation.mutate(item.id) },
    ]);
  };

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={getApiErrorMessage(error)} onRetry={() => void refetch()} />;

  return (
    <View className="flex-1 bg-background">
      <View className="gap-3 border-b border-border p-4">
        <Input value={search} onChangeText={setSearch} placeholder={t("admin.users.search", "Search users")} />
        <Select
          value={roleFilter}
          options={[{ label: t("common.all", "All roles"), value: "all" }, ...ROLE_OPTIONS]}
          onChange={setRoleFilter}
        />
        <Button
          title={t("admin.users.create", "Add user")}
          onPress={openCreate}
          fullWidth
          leading={<Glyph name="admin-users" size={16} color={colors.background} />}
        />
      </View>

      <ScrollView contentContainerClassName="gap-3 p-4 pb-16">
        {filtered.length === 0 ? (
          <EmptyState title={t("admin.users.empty", "No users found")} />
        ) : (
          filtered.map((item) => (
            <Card key={item.id} className="gap-3">
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-luxury-gold/15">
                  <Text className="font-semibold text-luxury-gold">{initialsOf(item.name)}</Text>
                </View>
                <View className="flex-1">
                  <Text variant="label" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Muted numberOfLines={1} className="text-xs">
                    {item.email}
                  </Muted>
                </View>
                <Badge label={item.role} color={ROLE_COLORS[item.role] ?? colors.mutedForeground} />
              </View>

              <View className="flex-row flex-wrap gap-y-1 border-t border-border pt-3">
                {item.phone ? (
                  <View className="w-1/2">
                    <Muted className="text-xs">{t("common.phone", "Phone")}</Muted>
                    <Muted className="text-xs text-foreground">{item.phone}</Muted>
                  </View>
                ) : null}
                {item.country ? (
                  <View className="w-1/2">
                    <Muted className="text-xs">{t("auth.fields.country", "Country")}</Muted>
                    <Muted className="text-xs text-foreground">{item.country}</Muted>
                  </View>
                ) : null}
                <View className="w-1/2">
                  <Muted className="text-xs">{t("admin.users.joined", "Joined")}</Muted>
                  <Muted className="text-xs text-foreground">{formatDate(item.createdAt)}</Muted>
                </View>
              </View>

              <View className="flex-row gap-2">
                <Button
                  title={t("common.edit", "Edit")}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onPress={() => openEdit(item)}
                />
                <Button
                  title={t("common.delete", "Delete")}
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onPress={() => confirmDelete(item)}
                />
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      <Modal visible={formOpen} transparent animationType="slide" onRequestClose={closeForm}>
        <Pressable className="flex-1 justify-end bg-black/70" onPress={closeForm}>
          <View
            className="max-h-[85%] rounded-t-lg border-t border-border bg-card"
            onStartShouldSetResponder={() => true}
          >
            <View className="flex-row items-center justify-between border-b border-border px-4 py-4">
              <Text variant="heading">
                {editingId ? t("admin.users.editTitle", "Edit user") : t("admin.users.createTitle", "New user")}
              </Text>
              <Pressable accessibilityRole="button" onPress={closeForm} hitSlop={10}>
                <Glyph name="close" size={22} color={colors.foreground} />
              </Pressable>
            </View>

            <ScrollView contentContainerClassName="gap-4 px-4 py-4 pb-8" keyboardShouldPersistTaps="handled">
              <Input
                label={t("auth.fields.name", "Name")}
                value={form.name}
                onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
                autoCapitalize="words"
              />
              <Input
                label={t("auth.fields.email", "Email")}
                value={form.email}
                onChangeText={(value) => setForm((prev) => ({ ...prev, email: value }))}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Input
                label={t("auth.fields.password", "Password")}
                value={form.password}
                onChangeText={(value) => setForm((prev) => ({ ...prev, password: value }))}
                secureTextEntry
                autoCapitalize="none"
                hint={editingId ? t("admin.users.passwordHint", "Leave blank to keep the current password") : undefined}
              />
              <Input
                label={t("auth.fields.phone", "Phone")}
                value={form.phone}
                onChangeText={(value) => setForm((prev) => ({ ...prev, phone: value }))}
                keyboardType="phone-pad"
              />
              <Input
                label={t("auth.fields.country", "Country")}
                value={form.country}
                onChangeText={(value) => setForm((prev) => ({ ...prev, country: value }))}
              />
              <Select
                label={t("admin.users.role", "Role")}
                value={form.role}
                options={ROLE_OPTIONS}
                onChange={(value) => setForm((prev) => ({ ...prev, role: value as Role }))}
              />
              <Button
                title={editingId ? t("common.saveChanges", "Save changes") : t("common.create", "Create")}
                onPress={() => saveMutation.mutate()}
                loading={saveMutation.isPending}
                size="lg"
                fullWidth
              />
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
