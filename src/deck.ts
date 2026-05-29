import Card from "./card.ts";
import { InterfaceDeck, Suit } from "./types.ts";

export class Deck implements InterfaceDeck {
  private cards: Card[] = [];

  constructor() {
    this.initializeDeck();
  }

  private initializeDeck(): void {
    for (let value = 1; value <= 13; value++) {
      for (const suit of Object.values(Suit)) {
        this.cards.push(new Card(value, suit));
      }
    }
  }

  shuffle(): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      const j = array[0] % (i + 1);
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  drawCard(): Card | null {
    const card = this.cards.shift();
    return card === undefined ? null : card;
  }
}
