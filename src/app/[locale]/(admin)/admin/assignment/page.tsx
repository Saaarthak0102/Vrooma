import React from "react";
import { listShowrooms } from "@/server/repositories/showrooms";
import { listUsers } from "@/server/repositories/users";
import { AssignmentClient } from "./AssignmentClient";

export default async function AdminAssignmentPage() {
  const showrooms = await listShowrooms();
  const consultants = await listUsers("consultant");

  return <AssignmentClient showrooms={showrooms} consultants={consultants} />;
}
