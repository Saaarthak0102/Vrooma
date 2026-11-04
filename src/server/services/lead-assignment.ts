import { Profile } from "@/types/domain";

export interface AssignConsultantParams {
  showroomId: string;
  modelId?: string | null;
}

/**
 * Assigns a lead to a sales consultant based on showroom location and round-robin priority.
 * Lead assignment is primarily handled by PostgreSQL RPC create_lead using assignment_rules.
 */
export function assignConsultant({
  showroomId: _showroomId,
}: AssignConsultantParams): Profile | null {
  return null;
}
