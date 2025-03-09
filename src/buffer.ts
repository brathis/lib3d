export interface RegionAware {}

export class Region {
  private start: number;
  private length: number;
  private owner: WeakRef<RegionAware>;
  private buffer: number[];

  constructor(
    start: number,
    length: number,
    owner: RegionAware,
    buffer: number[]
  ) {
    this.start = start;
    this.length = length;
    this.owner = new WeakRef(owner);
    this.buffer = buffer;
  }

  write(localIndex: number, value: number): void {
    let globalIndex = this.start + localIndex;
    if (globalIndex >= this.start + this.length) {
      // TODO: warn or crash or something
      return;
    }
    this.buffer[globalIndex] = value;
  }

  isStale(): boolean {
    return this.owner.deref() === undefined;
  }
}

export class RegionManager {
  private bufferSize: number | null;
  private buffer: number[];
  private regions: Region[] = [];

  constructor(buffer: number[], bufferSize: number | null) {
    this.buffer = buffer;
    this.bufferSize = bufferSize;
  }

  allocateRegion(length: number, owner: RegionAware): Region {
    // TODO: this is where the magic happens
    const region = new Region(0, length, owner, this.buffer);
    this.regions.push(region);
    return region;
  }
}
