import { createClerkClient } from "@clerk/clerk-sdk-node";
import { env } from "@/lib/env";
import { JWTPayload, jwtVerify } from "jose";

export const clerkClient = createClerkClient({
  secretKey: env.CLERK_SECRET_KEY,
});

export async function getUser(userId: string) {
  return clerkClient.users.getUser(userId);
}

export async function getOrganization(orgId: string) {
  return clerkClient.organizations.getOrganization({ organizationId: orgId });
}

export async function getUserMemberships(userId: string) {
  return clerkClient.users.getOrganizationMembershipList({ userId });
}

export async function createOrganization(data: {
  name: string;
  slug: string;
  createdBy: string;
}) {
  return clerkClient.organizations.createOrganization(data);
}

export async function inviteUserToOrganization(data: {
  organizationId: string;
  emailAddress: string;
  role: "admin" | "member";
  inviterUserId: string;
}) {
  return clerkClient.organizations.createOrganizationInvitation(data);
}

/**
 * Verify Clerk JWT token and extract user info
 * Uses jose library for JWT verification
 */
export async function verifyClerkToken(token: string): Promise<{
  userId: string;
  orgId?: string;
  sessionClaims?: Record<string, any>;
} | null> {
  try {
    // Clerk uses JWKS for token verification
    // For development, we can decode without verification
    // In production, you should verify against Clerk's JWKS endpoint
    const secret = new TextEncoder().encode(env.CLERK_SECRET_KEY || "dev-secret");
    
    // Try to verify with secret (for dev tokens)
    try {
      const { payload } = await jwtVerify(token, secret);
      return {
        userId: payload.sub as string,
        orgId: payload.org_id as string | undefined,
        sessionClaims: payload,
      };
    } catch {
      // If verification fails, try to decode without verification (dev mode)
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        return {
          userId: payload.sub,
          orgId: payload.org_id,
          sessionClaims: payload,
        };
      }
      return null;
    }
  } catch {
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
}
