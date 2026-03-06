import { Router, type Request, type Response, type NextFunction } from "express";
import { authRequired } from "../middleware/auth.js";
import { createLogger } from "../lib/logger.js";
import prisma from "../lib/prisma.js";
import {
  isComposioConfigured,
  initiateConnection,
  getActiveConnections,
  SUPPORTED_PROVIDERS,
} from "../services/composio.js";

const log = createLogger("connections");

export const connectionsRouter = Router();

connectionsRouter.get(
  "/providers",
  authRequired,
  (_req: Request, res: Response) => {
    res.json({
      providers: SUPPORTED_PROVIDERS,
      composioConfigured: isComposioConfigured(),
    });
  }
);

connectionsRouter.get(
  "/",
  authRequired,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;

      const connections = await prisma.connection.findMany({
        where: { userId },
        orderBy: { connectedAt: "desc" },
      });

      const mapped = connections.map((c) => ({
        id: c.id,
        userId: c.userId,
        provider: c.provider,
        accountLabel: c.accountLabel,
        status: c.status.toLowerCase(),
        composioConnectionId: c.composioConnectionId,
        lastUsedAt: c.lastUsedAt?.toISOString() ?? null,
        connectedAt: c.connectedAt.toISOString(),
      }));

      res.json({ connections: mapped });
    } catch (err) {
      log.error("Failed to list connections", err);
      next(err);
    }
  }
);

connectionsRouter.post(
  "/initiate",
  authRequired,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { provider, redirectUrl } = req.body as {
        provider: string;
        redirectUrl: string;
      };

      if (!provider || !redirectUrl) {
        res.status(400).json({ error: "provider and redirectUrl are required" });
        return;
      }

      const providerDef = SUPPORTED_PROVIDERS.find(
        (p) => p.id === provider || p.appName === provider
      );
      if (!providerDef) {
        res.status(400).json({ error: `Unknown provider: ${provider}` });
        return;
      }

      if (!isComposioConfigured()) {
        res.status(503).json({
          error: "External connections are not yet configured. Set COMPOSIO_API_KEY to enable.",
        });
        return;
      }

      const result = await initiateConnection(
        userId,
        providerDef.appName,
        redirectUrl
      );

      if (!result) {
        res.status(500).json({ error: "Failed to initiate connection" });
        return;
      }

      res.json({
        authUrl: result.authUrl,
        connectionId: result.connectionId,
      });
    } catch (err) {
      log.error("Failed to initiate connection", err);
      next(err);
    }
  }
);

connectionsRouter.post(
  "/callback",
  authRequired,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { provider, composioConnectionId, accountLabel } = req.body as {
        provider: string;
        composioConnectionId?: string;
        accountLabel?: string;
      };

      if (!provider) {
        res.status(400).json({ error: "provider is required" });
        return;
      }

      const providerDef = SUPPORTED_PROVIDERS.find(
        (p) => p.id === provider || p.appName === provider
      );

      const connection = await prisma.connection.create({
        data: {
          userId,
          provider,
          accountLabel: accountLabel || providerDef?.name || provider,
          status: "ACTIVE",
          composioConnectionId: composioConnectionId || "",
          connectedAt: new Date(),
        },
      });

      log.info(`Connection created: ${connection.id} (${provider}) for user ${userId}`);

      res.json({
        connection: {
          id: connection.id,
          userId: connection.userId,
          provider: connection.provider,
          accountLabel: connection.accountLabel,
          status: connection.status.toLowerCase(),
          composioConnectionId: connection.composioConnectionId,
          lastUsedAt: null,
          connectedAt: connection.connectedAt.toISOString(),
        },
      });
    } catch (err) {
      log.error("Failed to handle connection callback", err);
      next(err);
    }
  }
);

connectionsRouter.delete(
  "/:id",
  authRequired,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const connectionId = req.params.id;

      const connection = await prisma.connection.findFirst({
        where: { id: connectionId, userId },
      });

      if (!connection) {
        res.status(404).json({ error: "Connection not found" });
        return;
      }

      await prisma.connection.update({
        where: { id: connectionId },
        data: { status: "REVOKED" },
      });

      log.info(`Connection revoked: ${connectionId} (${connection.provider})`);

      res.json({ success: true });
    } catch (err) {
      log.error("Failed to disconnect", err);
      next(err);
    }
  }
);

connectionsRouter.post(
  "/sync",
  authRequired,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;

      if (!isComposioConfigured()) {
        res.json({ synced: 0, connections: [] });
        return;
      }

      const activeApps = await getActiveConnections(userId);

      let synced = 0;
      for (const appName of activeApps) {
        const existing = await prisma.connection.findFirst({
          where: {
            userId,
            provider: appName,
            status: "ACTIVE",
          },
        });

        if (!existing) {
          const providerDef = SUPPORTED_PROVIDERS.find(
            (p) => p.appName === appName
          );
          await prisma.connection.create({
            data: {
              userId,
              provider: appName,
              accountLabel: providerDef?.name || appName,
              status: "ACTIVE",
              connectedAt: new Date(),
            },
          });
          synced++;
        }
      }

      const connections = await prisma.connection.findMany({
        where: { userId },
        orderBy: { connectedAt: "desc" },
      });

      res.json({
        synced,
        connections: connections.map((c) => ({
          id: c.id,
          userId: c.userId,
          provider: c.provider,
          accountLabel: c.accountLabel,
          status: c.status.toLowerCase(),
          composioConnectionId: c.composioConnectionId,
          lastUsedAt: c.lastUsedAt?.toISOString() ?? null,
          connectedAt: c.connectedAt.toISOString(),
        })),
      });
    } catch (err) {
      log.error("Failed to sync connections", err);
      next(err);
    }
  }
);
