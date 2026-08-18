import type { Activity, Agent } from './activity';
import { LINEAGE_FORMAT } from './common';
import type { ConfidenceAssertion } from './confidence';
import {
  type Derivation,
  type DerivationInput,
  type Transformation,
  derivationId,
} from './derivation';
import type { LineageDocument } from './document';
import { parseLineageDocument } from './document';
import type { Entity } from './entity';
import type { Relation } from './relation';

type EntityInput = Entity;
type ActivityInput = Activity;
type AgentInput = Agent;

/**
 * Ergonomic builder for `lineage@1` documents. Validates on {@link build}.
 */
export class LineageBuilder {
  private id?: string;
  private profiles?: string[];
  private readonly entities = new Map<string, EntityInput>();
  private readonly activities = new Map<string, ActivityInput>();
  private readonly agents = new Map<string, AgentInput>();
  private readonly derivations: Derivation[] = [];
  private relations?: Relation[];
  private outputs: string[] = [];
  private attributes?: LineageDocument['attributes'];

  withId(id: string): this {
    this.id = id;
    return this;
  }

  withProfiles(...profiles: string[]): this {
    this.profiles = [...(this.profiles ?? []), ...profiles];
    return this;
  }

  withAttributes(attributes: NonNullable<LineageDocument['attributes']>): this {
    this.attributes = attributes;
    return this;
  }

  entity(id: string, entity: EntityInput): this {
    if (this.entities.has(id)) {
      throw new Error(`entity "${id}" already registered`);
    }
    this.entities.set(id, entity);
    return this;
  }

  activity(id: string, activity: ActivityInput): this {
    if (this.activities.has(id)) {
      throw new Error(`activity "${id}" already registered`);
    }
    this.activities.set(id, activity);
    return this;
  }

  agent(id: string, agent: AgentInput): this {
    if (this.agents.has(id)) {
      throw new Error(`agent "${id}" already registered`);
    }
    this.agents.set(id, agent);
    return this;
  }

  /**
   * Record that `activityId` produced `outputId` from `inputs`.
   */
  derive(args: {
    /** Optional, as in the wire format: the output already identifies it. */
    id?: string;
    output: string;
    activity: string;
    inputs?: Array<DerivationInput | string>;
    transformation?: Transformation;
    confidence?: ConfidenceAssertion;
    attributes?: Derivation['attributes'];
  }): this {
    const id = derivationId(args);
    if (this.derivations.some((d) => derivationId(d) === id)) {
      throw new Error(`derivation "${id}" already registered`);
    }
    const inputs: DerivationInput[] = (args.inputs ?? []).map((input) =>
      typeof input === 'string' ? { entity: input, effect: 'direct' as const } : input
    );
    this.derivations.push({
      ...(args.id ? { id: args.id } : {}),
      output: args.output,
      activity: args.activity,
      inputs,
      ...(args.transformation ? { transformation: args.transformation } : {}),
      ...(args.confidence ? { confidence: args.confidence } : {}),
      ...(args.attributes ? { attributes: args.attributes } : {}),
    });
    return this;
  }

  relation(relation: Relation): this {
    this.relations = [...(this.relations ?? []), relation];
    return this;
  }

  withOutputs(...entityIds: string[]): this {
    this.outputs = [...this.outputs, ...entityIds];
    return this;
  }

  /** Assemble and strictly validate the document. */
  build(): LineageDocument {
    return parseLineageDocument({
      format: LINEAGE_FORMAT,
      ...(this.id ? { id: this.id } : {}),
      ...(this.profiles && this.profiles.length > 0 ? { profiles: this.profiles } : {}),
      entities: Object.fromEntries(this.entities),
      activities: Object.fromEntries(this.activities),
      agents: Object.fromEntries(this.agents),
      derivations: this.derivations,
      ...(this.relations && this.relations.length > 0 ? { relations: this.relations } : {}),
      outputs: this.outputs,
      ...(this.attributes ? { attributes: this.attributes } : {}),
    });
  }
}
