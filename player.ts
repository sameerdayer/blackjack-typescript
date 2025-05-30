import { InterfacePlayer } from "./types";
import Card from "./card";
export class Player implements InterfacePlayer {
  handCards: Card[] = [];

  receiveCard(card: Card): void {
    if (card instanceof Card) {
      this.handCards.push(card);
    }
  }

  revealHand(): Card[] {
    return this.handCards;
  }

  getScore(): number {
    let total = 0;
    let aceCount = 0;
    for (const card of this.handCards) {
      if (card.value === 1) {
        aceCount++;
        total += 1;
      } else if (card.value >= 10) {
        total += 10;
      } else {
        total += card.value;
      }
    }
    while (aceCount > 0 && total + 10 <= 21) {
      total += 10;
      aceCount--;
    }
    return total;
  }
}
