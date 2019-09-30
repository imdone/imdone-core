namespace YearOfHell.Commands
{
    using System.Collections.Generic;
    using System.Linq;
    using AncientLightStudios.Nanoject;
    using Model;
    using Model.Cards;
    using UnityEngine;

    [DependencyComponent]
    public class KillSurvivorCommandHandler : CommandHandlerWithStateBase<KillSurvivorCommand>
    {
        public KillSurvivorCommandHandler(Dispatcher dispatcher, GameState gameState) : base(dispatcher, gameState)
        {
        }

        protected override void Handle(KillSurvivorCommand command)
        {
            
            // destroy all cards that belong to this survivor.
            var cards = new HashSet<Card>();

            void RemoveSurvivorsCardsFrom(Survivor survivor, CardPile pile, ISet<Card> collected)
            {
                foreach (var card in pile.cards.Where(it => it.owner == survivor).ToList())
                {
                    collected.Add(card);
                    pile.TryDrop(card);
                }
            }

            var heWhoIsDeadNow = command.Survivor;
            RemoveSurvivorsCardsFrom(heWhoIsDeadNow, GameState.deck, cards);
            RemoveSurvivorsCardsFrom(heWhoIsDeadNow, GameState.drawPile, cards);
            RemoveSurvivorsCardsFrom(heWhoIsDeadNow, GameState.hand, cards);
            RemoveSurvivorsCardsFrom(heWhoIsDeadNow, GameState.discardPile, cards);
            
            foreach (var card in cards)
            {
                // TODO:10 This should also be animated. +feature +ui
                Object.Destroy(card.gameObject);
            }
            
            // remove the survivor.
            GameState.survivors.Remove(heWhoIsDeadNow);
            Object.Destroy(heWhoIsDeadNow.gameObject);
            
            if (GameState.survivors.Count == 0)
            {
                Debug.Log("Game over");
                // TODO:80 proper end game +feature
                Application.Quit();
            }
        }
    }
}
