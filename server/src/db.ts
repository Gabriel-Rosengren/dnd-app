export class db {
  private characters: Array<Object>;

  constructor() {
    this.characters = [
      {
        id: "1",
        name: "Tink Fiddleton",
        hitPoints: { current: 20 },
      },
      {
        id: "2",
        name: "Formik 'Spores' Doeger Rowynn Piddock Yddae",
        hitPoints: { current: 20 },
      },
    ];
  }

  public create(id: string, char: Object) {
    const index = this.findIndex(id);
    if (index !== -1) return false;

    this.characters[index] = char;
    return true;
  }

  public get(id: string) {
    const index = this.findIndex(id);
    if (index === -1) return false;

    return this.characters[index];
  }

  public deleted(id: string) {
    const index = this.findIndex(id);
    if (index === -1) return false;

    this.characters.splice(index, 1);
    return true;
  }

  public update(id: string, char: Object) {
    const index = this.findIndex(id);
    if (index === -1) return false;

    this.characters[index] = char;
    return true;
  }

  private findIndex(id: string): number {
    const index = this.characters.findIndex((char: any) => char.id === id);
    return index;
  }
}
