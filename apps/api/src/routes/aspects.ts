import { Router, type Request, type Response, type NextFunction } from "express";
import type { AspectSlug } from "@vibe-founder/shared";
import { loadFoundersNotes, loadAspectBySlug } from "../services/markdown.js";
import { createLogger } from "../lib/logger.js";

const log = createLogger("aspects");

export const aspectsRouter = Router();

aspectsRouter.get("/", (_req: Request, res: Response, next: NextFunction) => {
  try {
    const notes = loadFoundersNotes();
    const aspects = notes.map((note) => ({
      slug: note.slug,
      title: note.title,
      summary: "",
      actions: [],
      systems: [],
      rawMarkdown: note.rawMarkdown,
    }));
    res.json(aspects);
  } catch (err) {
    log.error("Failed to load aspects", err);
    next(err);
  }
});

aspectsRouter.get("/:slug", (req: Request, res: Response, next: NextFunction) => {
  try {
    const aspect = loadAspectBySlug(req.params.slug as AspectSlug);
    if (!aspect) {
      res.status(404).json({ error: "Aspect not found" });
      return;
    }
    res.json({
      slug: aspect.slug,
      title: aspect.title,
      summary: "",
      actions: [],
      systems: [],
      rawMarkdown: aspect.rawMarkdown,
    });
  } catch (err) {
    log.error("Failed to load aspect", err, { slug: req.params.slug });
    next(err);
  }
});
