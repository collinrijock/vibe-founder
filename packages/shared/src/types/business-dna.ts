export interface BusinessDNA {
  voice: {
    tone: string;
    avoid: string[];
    examples: string[];
  };
  principles: string[];
  boundaries: {
    maxEmailSendsPerDay: number;
    requireApprovalFor: string[];
    neverContact: string[];
  };
  defaults: Record<string, string>;
}
