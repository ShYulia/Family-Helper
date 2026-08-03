# Product Vision

## Long-Term Vision

Family Helper is a modular personal assistant built to reduce the mental load
that comes from recurring household tasks. Families carry a constant,
low-grade burden of remembering, planning, and coordinating things that repeat
week after week — what to eat, what to buy, what to do on weekends, and
larger life admin like job searching. Family Helper's purpose is to absorb
that recurring mental overhead by handling the repetitive planning work
automatically, while keeping the human in control of anything that matters
(spending money, committing time, making final decisions).

The system is designed as a set of independent but eventually cooperating
modules, each responsible for one area of household life. Modules can be
adopted one at a time, and each one must be useful on its own — the vision is
incremental, not a single big-bang system.

## Future Modules

- **Grocery Shopper** — Maintains recurring grocery needs and prepares a
  weekly shopping cart automatically, ready for human review and approval.
- **Meal Planner** — Plans meals for the household and produces the
  ingredient/grocery needs those meals require.
- **Weekend Planner** — Suggests and organizes weekend activities and plans
  for the family.
- **Job Search Assistant** — Assists with the ongoing work of searching for
  jobs (tracking opportunities, applications, and follow-ups).
- **Telegram notifications/approval workflows** — The communication and
  approval layer across all modules: notifies the family of what the system
  has prepared and collects human approval before anything consequential
  happens.

## How Grocery Shopper and Meal Planner Will Eventually Communicate

At a conceptual level, Meal Planner and Grocery Shopper are designed to work
together without either one depending on the other to function:

- **Grocery Shopper is independently capable.** On its own, it maintains
  recurring grocery lists (the household's regular, repeating needs) and
  automatically prepares a weekly shopping cart from them, with no
  involvement from Meal Planner.
- **Meal Planner produces a grocery list.** When present, Meal Planner plans
  meals and translates those meals into the ingredients and items needed to
  cook them — expressed as a grocery list.
- **Grocery Shopper consumes that list.** When Meal Planner is available,
  Grocery Shopper incorporates the grocery list it produces into the final
  cart, alongside the recurring items it already manages. Meal Planner's
  output augments Grocery Shopper's normal behavior rather than replacing it.
- **Approvals flow through Telegram.** Before anything is finalized, the
  prepared cart (recurring items plus any meal-driven items) is presented to
  the family via Telegram for review and approval.
- **The human always does the final checkout.** No module ever completes a
  purchase on its own. The system prepares and proposes; a person always
  performs the actual checkout.
