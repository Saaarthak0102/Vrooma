import React from "react";
import { listUsers } from "@/server/repositories/users";
import { UsersClient } from "./UsersClient";

export default async function AdminUsersPage() {
  const users = await listUsers();
  return <UsersClient initialUsers={users} />;
}
