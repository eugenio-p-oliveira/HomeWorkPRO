import { useState } from "react";
import { useListUsers, useCreateUser, useDeleteUser, useUpdateUser } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListUsersQueryKey } from "@workspace/api-client-react";
import Layout, { PageHeader } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Search, Trash2, Pencil, Users } from "lucide-react";
import { toast } from "sonner";
import { roleLabel, formatDate } from "@/lib/utils";

const ROLES = ["admin", "coordinator", "teacher", "student"] as const;
const roleBadge: Record<string, string> = {
  admin: "bg-red-50 text-red-700 border-red-200",
  coordinator: "bg-purple-50 text-purple-700 border-purple-200",
  teacher: "bg-blue-50 text-blue-700 border-blue-200",
  student: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student", registrationNumber: "" });

  const params = { search: search || undefined, role: roleFilter !== "all" ? roleFilter as any : undefined };
  const { data: users, isLoading } = useListUsers(params);
  const createMutation = useCreateUser();
  const deleteMutation = useDeleteUser();
  const updateMutation = useUpdateUser();

  const invalidate = () => qc.invalidateQueries({ queryKey: getListUsersQueryKey() });

  const openCreate = () => { setEditUser(null); setForm({ name: "", email: "", password: "", role: "student", registrationNumber: "" }); setDialogOpen(true); };
  const openEdit = (u: any) => { setEditUser(u); setForm({ name: u.name, email: u.email, password: "", role: u.role, registrationNumber: u.registrationNumber ?? "" }); setDialogOpen(true); };

  const handleSubmit = () => {
    if (!form.name || !form.email) { toast.error("Preencha nome e e-mail"); return; }
    if (editUser) {
      updateMutation.mutate({ userId: editUser.id, data: { name: form.name, email: form.email, role: form.role as any, registrationNumber: form.registrationNumber || null } }, {
        onSuccess: () => { toast.success("Usuário atualizado"); setDialogOpen(false); invalidate(); },
        onError: () => toast.error("Erro ao atualizar"),
      });
    } else {
      if (!form.password) { toast.error("Senha obrigatória"); return; }
      createMutation.mutate({ data: { name: form.name, email: form.email, password: form.password, role: form.role as any, registrationNumber: form.registrationNumber || null } }, {
        onSuccess: () => { toast.success("Usuário criado"); setDialogOpen(false); invalidate(); },
        onError: () => toast.error("Erro ao criar usuário"),
      });
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Excluir usuário?")) return;
    deleteMutation.mutate({ userId: id }, { onSuccess: () => { toast.success("Excluído"); invalidate(); }, onError: () => toast.error("Erro ao excluir") });
  };

  return (
    <Layout>
      <div className="p-8">
        <PageHeader
          title="Usuários"
          description="Gerencie alunos, professores e administradores"
          action={<Button onClick={openCreate} size="sm"><Plus className="w-4 h-4 mr-1.5" />Novo usuário</Button>}
        />

        {/* Filters */}
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Todos os perfis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os perfis</SelectItem>
              {ROLES.map(r => <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Matrícula</TableHead>
                <TableHead>Cadastrado</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : !users?.length ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Nenhum usuário encontrado
                </TableCell></TableRow>
              ) : users.map(u => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="w-7 h-7">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                          {u.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">{u.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${roleBadge[u.role] ?? ""}`}>
                      {roleLabel(u.role)}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.registrationNumber ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(u)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:text-destructive" onClick={() => handleDelete(u.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editUser ? "Editar usuário" : "Novo usuário"}</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5"><Label>Nome completo</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>E-mail</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              {!editUser && <div className="space-y-1.5"><Label>Senha</Label><Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></div>}
              <div className="space-y-1.5">
                <Label>Perfil</Label>
                <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Matrícula (opcional)</Label><Input value={form.registrationNumber} onChange={e => setForm(f => ({ ...f, registrationNumber: e.target.value }))} /></div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button className="flex-1" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                  {editUser ? "Salvar" : "Criar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
