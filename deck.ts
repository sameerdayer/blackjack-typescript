import Card from "./card";
import { InterfaceDeck, Suit } from "./types";

export class Deck implements InterfaceDeck {
  cards: Card[] = [];

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
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  drawCard(): Card | null {
    const card = this.cards.shift();
    return card === undefined ? null : card;
  }
}
