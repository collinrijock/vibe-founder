import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "@langchain/core/documents";
import { Embeddings, type EmbeddingsParams } from "@langchain/core/embeddings";
import type { AspectSlug } from "@vibe-founder/shared";
import { loadFoundersNotes } from "./markdown.js";
import { createLogger } from "../lib/logger.js";

const log = createLogger("vectorstore");

interface Chunk {
  text: string;
  metadata: {
    slug: AspectSlug;
    title: string;
    chunkIndex: number;
  };
}

class LocalEmbeddings extends Embeddings {
  private pipeline: any = null;

  constructor(params?: EmbeddingsParams) {
    super(params ?? {});
  }

  private async getPipeline() {
    if (!this.pipeline) {
      const { pipeline } = await import("@xenova/transformers");
      this.pipeline = await pipeline(
        "feature-extraction",
        "Xenova/all-MiniLM-L6-v2"
      );
    }
    return this.pipeline;
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const pipe = await this.getPipeline();
    const results: number[][] = [];
    for (const text of texts) {
      const output = await pipe(text, { pooling: "mean", normalize: true });
      results.push(Array.from(output.data as Float32Array));
    }
    return results;
  }

  async embedQuery(text: string): Promise<number[]> {
    const pipe = await this.getPipeline();
    const output = await pipe(text, { pooling: "mean", normalize: true });
    return Array.from(output.data as Float32Array);
  }
}

function chunkMarkdown(
  markdown: string,
  slug: AspectSlug,
  title: string,
  maxChunkSize = 800,
  overlap = 100
): Chunk[] {
  const sections = markdown.split(/(?=^##\s)/m);
  const chunks: Chunk[] = [];
  let chunkIndex = 0;

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    if (trimmed.length <= maxChunkSize) {
      chunks.push({
        text: trimmed,
        metadata: { slug, title, chunkIndex: chunkIndex++ },
      });
    } else {
      const paragraphs = trimmed.split(/\n\n+/);
      let current = "";

      for (const para of paragraphs) {
        if (current.length + para.length + 2 > maxChunkSize && current) {
          chunks.push({
            text: current.trim(),
            metadata: { slug, title, chunkIndex: chunkIndex++ },
          });
          const words = current.split(/\s+/);
          const overlapWords = words.slice(-Math.ceil(overlap / 5));
          current = overlapWords.join(" ") + "\n\n" + para;
        } else {
          current = current ? current + "\n\n" + para : para;
        }
      }

      if (current.trim()) {
        chunks.push({
          text: current.trim(),
          metadata: { slug, title, chunkIndex: chunkIndex++ },
        });
      }
    }
  }

  return chunks;
}

let vectorStoreInstance: MemoryVectorStore | null = null;
let allChunks: Chunk[] = [];

export async function getVectorStore(): Promise<MemoryVectorStore> {
  if (vectorStoreInstance) return vectorStoreInstance;

  log.info("Building vector store from knowledge base...");
  const notes = loadFoundersNotes();

  allChunks = [];
  for (const note of notes) {
    const noteChunks = chunkMarkdown(
      note.rawMarkdown,
      note.slug,
      note.title
    );
    allChunks.push(...noteChunks);
  }

  log.info(`Created ${allChunks.length} chunks from ${notes.length} notes`);

  const embeddings = new LocalEmbeddings();
  const documents = allChunks.map(
    (chunk) =>
      new Document({
        pageContent: chunk.text,
        metadata: chunk.metadata,
      })
  );

  vectorStoreInstance = await MemoryVectorStore.fromDocuments(
    documents,
    embeddings
  );

  log.info("Vector store ready");
  return vectorStoreInstance;
}

export async function searchNotes(
  query: string,
  k = 5,
  aspectFilter?: AspectSlug
): Promise<Document[]> {
  const store = await getVectorStore();
  const results = await store.similaritySearch(query, k * 2);

  if (aspectFilter) {
    return results
      .filter((doc) => doc.metadata.slug === aspectFilter)
      .slice(0, k);
  }

  return results.slice(0, k);
}

export function getAllChunks(): Chunk[] {
  return allChunks;
}

/* ------------------------------------------------------------------ */
/*  Business-data vector store (per-business, lightweight)            */
/* ------------------------------------------------------------------ */

interface VectorChunk {
  text: string;
  embedding: number[];
  metadata: Record<string, string>;
}

const businessStores = new Map<string, { chunks: VectorChunk[] }>();

let pipelineInstance: any = null;
async function getModel() {
  if (!pipelineInstance) {
    const { pipeline } = await import("@xenova/transformers");
    pipelineInstance = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    );
  }
  return pipelineInstance;
}

function chunkText(text: string, maxLen = 800, overlap = 100): string[] {
  if (text.length <= maxLen) return [text];

  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  let current = "";

  for (const para of paragraphs) {
    if (current.length + para.length + 2 > maxLen && current) {
      chunks.push(current.trim());
      const words = current.split(/\s+/);
      const overlapWords = words.slice(-Math.ceil(overlap / 5));
      current = overlapWords.join(" ") + "\n\n" + para;
    } else {
      current = current ? current + "\n\n" + para : para;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function indexBusinessData(
  businessId: string,
  plans: { aspectSlug: string; title: string; rawMarkdown: string }[]
) {
  const model = await getModel();
  const chunks: VectorChunk[] = [];

  for (const plan of plans) {
    if (!plan.rawMarkdown?.trim()) continue;

    const sections = plan.rawMarkdown.split(/(?=^##\s)/m);
    for (const section of sections) {
      const trimmed = section.trim();
      if (!trimmed) continue;

      const subChunks = chunkText(trimmed, 800, 100);
      for (const text of subChunks) {
        const output = await model(text, { pooling: "mean", normalize: true });
        chunks.push({
          text,
          embedding: Array.from(output.data),
          metadata: {
            aspect: plan.aspectSlug,
            title: plan.title,
            source: "business",
            businessId,
          },
        });
      }
    }
  }

  businessStores.set(businessId, { chunks });
  log.info(
    `Indexed ${chunks.length} business chunks for business ${businessId}`
  );
  return chunks.length;
}

export async function searchBusinessData(
  businessId: string,
  query: string,
  topK = 5
): Promise<{ text: string; score: number; metadata: Record<string, string> }[]> {
  const store = businessStores.get(businessId);
  if (!store || store.chunks.length === 0) return [];

  const model = await getModel();
  const output = await model(query, { pooling: "mean", normalize: true });
  const queryEmbedding = Array.from(output.data) as number[];

  const scored = store.chunks.map((chunk) => ({
    text: chunk.text,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
    metadata: chunk.metadata,
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

export async function searchAll(
  query: string,
  businessId?: string,
  topK = 5
): Promise<{ text: string; score: number; metadata: Record<string, string>; source: string }[]> {
  const knowledgeResults = (await searchNotes(query, topK)).map((doc) => ({
    text: doc.pageContent,
    score: 1,
    metadata: doc.metadata as Record<string, string>,
    source: "knowledge-base" as const,
  }));

  let businessResults: {
    text: string;
    score: number;
    metadata: Record<string, string>;
    source: string;
  }[] = [];

  if (businessId) {
    businessResults = (await searchBusinessData(businessId, query, topK)).map(
      (r) => ({ ...r, source: "business" })
    );
  }

  const combined = [...knowledgeResults, ...businessResults];
  combined.sort((a, b) => b.score - a.score);
  return combined.slice(0, topK);
}
