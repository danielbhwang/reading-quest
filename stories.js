/* Reading Quest stories: both kids' tracks, starter stories, phonics lessons and chapter books.
   Loaded before app.js; its top-level consts are shared with app.js. */
/* ============================================================
   SON'S TRACK — "Biscuit & the Pocket Pals"
   Original characters: Biscuit (an easygoing orange cat in a red cap)
   and his Pocket Pals: Zip (lightning bunny, she), Plip (water frog, he),
   Toasty (fire pup, he), Leafy (plant pal, she), Chip (chick, she).

   Level kinds:
     letters : items = [letter, emoji, keyword]
     words   : items = list of words (a random round is drawn each time)
     story   : stories = [{title, emoji, text, qs}]
               text  -> blank line = new page
               qs    -> [question, [options...], indexOfCorrect]
   ============================================================ */
const SON_TRACK = {
  key: 'son',
  trackName: 'Biscuit & the Pocket Pals',
  hero: 'Biscuit',
  mascot: '🐱',
  levels: [
    {
      n: 1, title: 'Letter Sounds', kind: 'letters', roundSize: 8, pass: 0.75,
      intro: 'Say the sound each letter makes!',
      items: [
        ['a','🍎','apple'],['b','🐻','bear'],['c','🐱','cat'],['d','🐶','dog'],
        ['e','🥚','egg'],['f','🐟','fish'],['g','🐐','goat'],['h','🎩','hat'],
        ['i','🦎','iguana'],['j','🧃','juice'],['k','🪁','kite'],['l','🦁','lion'],
        ['m','🌙','moon'],['n','🪺','nest'],['o','🐙','octopus'],['p','🐷','pig'],
        ['q','👑','queen'],['r','🌈','rainbow'],['s','☀️','sun'],['t','🐢','turtle'],
        ['u','☂️','umbrella'],['v','🎻','violin'],['w','🐋','whale'],['x','🦊','fox'],
        ['y','🪀','yo-yo'],['z','🦓','zebra']
      ]
    },
    {
      n: 2, title: 'Short Words', kind: 'words', roundSize: 10, pass: 0.8,
      intro: 'Sound it out: c - a - t!',
      items: ('cat hat bat sat mat rat map cap nap tap sun run fun bun hug bug ' +
              'rug mug cup pup dog log hop top pot hot pig big dig wig sit hit ' +
              'pin win fin bed red fed ten hen pen net jet wet yes box fox mop ' +
              'jam ham van can fan man dad mom kid lid zip web hum').split(' ')
    },
    {
      n: 3, title: 'Sight Words', kind: 'words', roundSize: 10, pass: 0.8,
      intro: 'These words show up everywhere!',
      items: ('the a and to is in it you said for up look we can see my ' +
              'go me like on at he she was are of they here come play blue ' +
              'red yellow one two three down funny help jump little make not ' +
              'run where with this have do').split(' ')
    },
    {
      n: 4, title: 'Sentences', kind: 'story',
      stories: [
        { title: 'Biscuit and the Big Hat', emoji: '🎩',
          text: `Biscuit is a cat.

Biscuit has a big red hat.

The hat is on his head.

Zip the bunny sees the hat.

Zip and Biscuit hop and hop.`,
          qs: [
            ['Who is Biscuit?', ['🐱 A cat', '🐶 A dog', '🐟 A fish'], 0],
            ['What color is the hat?', ['🔴 Red', '🔵 Blue', '🟢 Green'], 0],
            ['Who sees the hat?', ['🐰 Zip', '🐸 A frog', '🐷 A pig'], 0],
            ['How do you think Biscuit feels?', ['😊 Happy', '😢 Sad', '😠 Mad'], 0]
          ] },
        { title: 'Plip Gets Wet', emoji: '🐸',
          text: `Plip is a frog.

Plip can swim in the pond.

Biscuit sat on a log.

Plip got Biscuit wet!

Biscuit did not mind. He had fun.`,
          qs: [
            ['What is Plip?', ['🐸 A frog', '🐻 A bear', '🐔 A hen'], 0],
            ['Where can Plip swim?', ['💧 In the pond', '🛏️ In bed', '🚗 In a car'], 0],
            ['Where did Biscuit sit?', ['🪵 On a log', '🚌 On a bus', '🪑 On a chair'], 0],
            ['Did Biscuit have fun?', ['😄 Yes, he had fun', '😠 No, he was mad', '😴 He fell asleep'], 0]
          ] },
        { title: 'Toasty the Fire Pup', emoji: '🔥',
          text: `Toasty is a pup.

Toasty has a red tail.

His tail is hot, hot, hot!

Biscuit and Toasty sit by the tent.

Toasty helps keep them warm.`,
          qs: [
            ['What is Toasty?', ['🐶 A pup', '🐱 A cat', '🐢 A turtle'], 0],
            ['What color is his tail?', ['🔴 Red', '🟣 Purple', '⚪ White'], 0],
            ['Where do they sit?', ['⛺ By the tent', '🛁 In the tub', '🏫 At school'], 0],
            ['How does Toasty help?', ['🔥 He keeps them warm', '🎵 He sings', '⛏️ He digs'], 0]
          ] },
        { title: 'The Big Nap', emoji: '😴',
          text: `Biscuit is in the sun.

The sun is hot and the rug is soft.

Zip, Plip, and Toasty get on the rug.

They all nap in a big pile.

Biscuit is the last one up.`,
          qs: [
            ['Where is Biscuit?', ['☀️ In the sun', '🌧️ In the rain', '❄️ In the snow'], 0],
            ['What is soft?', ['🟫 The rug', '🪨 A rock', '🪵 A stick'], 0],
            ['What do they all do?', ['😴 Nap', '🏃 Run', '🏊 Swim'], 0],
            ['Who is the last one up?', ['🐱 Biscuit', '🐰 Zip', '🐸 Plip'], 0]
          ] }
      ]
    },
    {
      n: 5, title: 'Short Stories', kind: 'story',
      stories: [
        { title: 'Zip Is Fast', emoji: '⚡',
          text: `Zip the bunny can run very fast. Biscuit wants to race.

"Ready, set, go!" said Plip. Zip zoomed past the tree.

Biscuit did not win, but he did not care. "Let's race again!" he said.`,
          qs: [
            ['What can Zip do?', ['⚡ Run very fast', '🦅 Fly', '🎨 Paint'], 0],
            ['Who said "Ready, set, go"?', ['🐸 Plip', '🐶 Toasty', '🐱 Biscuit'], 0],
            ['Who won the race?', ['🐰 Zip', '🐱 Biscuit', '🐸 Plip'], 0],
            ['How did Biscuit feel about losing?', ['😎 He did not care', '😭 He cried', '😡 He was very mad'], 0]
          ] },
        { title: 'The Lost Ball', emoji: '⚽',
          text: `Biscuit had a red ball. He kicked it up, up, up.

The ball went into a bush. "Oh no!" said Biscuit.

Leafy the plant pal looked in the bush. She found the ball!

Biscuit said, "Thank you, Leafy!"`,
          qs: [
            ['What color was the ball?', ['🔴 Red', '🟡 Yellow', '🔵 Blue'], 0],
            ['Where did the ball go?', ['🌳 Into a bush', '🌊 Into the sea', '🏠 On the roof'], 0],
            ['Who found the ball?', ['🌿 Leafy', '🐰 Zip', '🐶 Toasty'], 0],
            ['What did Biscuit say?', ['🙏 Thank you!', '👋 Goodbye!', '😴 Good night!'], 0]
          ] },
        { title: 'Rainy Day', emoji: '🌧️',
          text: `It is raining, so Biscuit stays in. He is a little sad.

Plip loves the rain! He jumps in every puddle.

Biscuit puts on his boots and goes out too. Now the rain is fun!`,
          qs: [
            ['Why does Biscuit stay in?', ['🌧️ It is raining', '🌙 It is night', '🤒 He is sick'], 0],
            ['Who loves the rain?', ['🐸 Plip', '🐶 Toasty', '🐔 Chip'], 0],
            ['What does Biscuit put on?', ['🥾 Boots', '🎩 A hat', '🧤 Mittens'], 0],
            ['How does Biscuit feel at the end?', ['😄 Happy', '😢 Sad', '😨 Scared'], 0]
          ] },
        { title: "Toasty's Snack", emoji: '🍞',
          text: `Toasty is hungry. He wants a hot snack.

Biscuit makes toast. Toasty puffs on it to make it warm.

Oops! The toast is too hot and black. They both laugh and make more.`,
          qs: [
            ['What does Toasty want?', ['🍞 A hot snack', '🧊 Ice', '🛁 A bath'], 0],
            ['What does Biscuit make?', ['🍞 Toast', '🍰 Cake', '🍝 Noodles'], 0],
            ['What happened to the toast?', ['⬛ It got black', '💧 It got wet', '🌈 It got pink'], 0],
            ['What did they do next?', ['😂 Laughed and made more', '😠 Got mad', '🏃 Ran away'], 0]
          ] }
      ]
    },
    {
      n: 6, title: 'Bigger Stories', kind: 'story',
      stories: [
        { title: 'The Shell at the Beach', emoji: '🐚',
          text: `Biscuit and Plip went to the beach. The sand was hot.

Plip found a shell. It was pink and shiny.

"Shh," said Biscuit. "Can you hear the sea in the shell?"

Plip held the shell up to his ear. "I hear a splash!" he said.

Then they put the shell back, so a crab could have a home.`,
          qs: [
            ['Where did they go?', ['🏖️ The beach', '🏔️ The hills', '🏪 The shop'], 0],
            ['What did Plip find?', ['🐚 A shell', '🪙 A coin', '🦀 A crab'], 0],
            ['What color was the shell?', ['🩷 Pink', '⬛ Black', '🟩 Green'], 0],
            ['Why did they put the shell back?', ['🦀 So a crab could have a home', '🗑️ It was dirty', '😴 They were tired'], 0]
          ] },
        { title: 'Chip the Chick', emoji: '🐥',
          text: `A little chick named Chip was stuck on a branch. "Cheep! Cheep!" she cried.

Zip could not jump that high. Toasty could not climb.

Then Biscuit had a plan. He stood on a stump and stretched up.

Chip hopped onto his hat. Then she slid down to the grass.

"Thanks!" chirped Chip. Now she is the newest Pocket Pal.`,
          qs: [
            ['Where was Chip stuck?', ['🌳 On a branch', '🕳️ In a hole', '🏠 On a roof'], 0],
            ['Who had a plan?', ['🐱 Biscuit', '🐰 Zip', '🐶 Toasty'], 0],
            ['What did Biscuit stand on?', ['🪵 A stump', '🪜 A ladder', '🛹 A skateboard'], 0],
            ['What is Chip now?', ['⭐ The newest Pocket Pal', '🦅 A big eagle', '🐟 A fish'], 0]
          ] },
        { title: 'The Big Storm', emoji: '⛈️',
          text: `Flash! Crash! A big storm came to the park.

Zip was not scared. She is a lightning pal, after all.

But Plip and Leafy were scared, so they hid under a bench.

Biscuit got a soft blanket, and they all snuggled up.

When the storm stopped, they saw a rainbow stretch across the sky.`,
          qs: [
            ['What came to the park?', ['⛈️ A big storm', '🎪 A circus', '🚒 A fire truck'], 0],
            ['Who was NOT scared?', ['🐰 Zip', '🐸 Plip', '🌿 Leafy'], 0],
            ['Where did Plip and Leafy hide?', ['🪑 Under a bench', '🌳 In a tree', '🚗 In a car'], 0],
            ['What did they see at the end?', ['🌈 A rainbow', '🌙 The moon', '🎈 A balloon'], 0]
          ] },
        { title: 'Brush, Brush, Brush', emoji: '🪥',
          text: `Every night, Biscuit brushes his teeth. Brush, brush, brush!

Toasty does not want to brush. "My teeth are fine," he says.

Biscuit shows him a trick. They sing a song while they brush.

Toasty grins. His teeth shine bright and white.

"That was the best brush ever!" he says.`,
          qs: [
            ['What does Biscuit do every night?', ['🪥 Brushes his teeth', '🍪 Eats cookies', '📺 Watches TV'], 0],
            ['Who did not want to brush?', ['🐶 Toasty', '🐸 Plip', '🐰 Zip'], 0],
            ['What trick did Biscuit show?', ['🎵 Sing a song', '🤸 Do a flip', '🙈 Shut your eyes'], 0],
            ['How did Toasty feel at the end?', ['😁 Happy', '😢 Sad', '😠 Grumpy'], 0]
          ] }
      ]
    }
  ],
  rewards: [
    ['⚡','Zappy'],['💧','Drizzle'],['🔥','Ember Pup'],['🌿','Sprout'],['🪨','Rocky'],
    ['❄️','Frosty'],['🌙','Moonbeam'],['☀️','Sunny'],['🌪️','Whirl'],['🍄','Mushy'],
    ['🦋','Flutter'],['🐞','Dotty'],['🌸','Petal'],['⭐','Twinkle'],['🫧','Bubbles'],
    ['🍀','Lucky'],['🌋','Lava Lou'],['🎈','Floaty'],['🐚','Shelly'],['🌊','Wavey'],
    ['🍩','Sprinkles'],['🎵','Melody'],['🧲','Magnet'],['🌵','Prickles'],['🪐','Orbit']
  ]
};

/* ============================================================
   MILES — "Detective Biscuit" mystery series (original).
   Biscuit puts on his detective hat, looks for clues, and thinks.
   Adds mysteries to Levels 4–6 and two new top levels (7–8)
   that climb toward early-chapter mystery books (~grade 2).
   ============================================================ */
const SON_DETECTIVE = {
  4: [
    { title: 'Where Is the Cap?', emoji: '🧢',
      text: `Biscuit's red cap is gone!

"I will find it," said Biscuit. "I am a detective."

Is it in the bed? No.

Is it in the tub? No.

He sees a red tip under the rug.

It is the cap! Zip sat on it in her nap.`,
      qs: [
        ['What is gone?', ['🧢 The red cap', '⚽ A ball', '🍞 The toast'], 0],
        ['Where did Biscuit look first?', ['🛏️ In the bed', '🌳 In a tree', '🚗 In a car'], 0],
        ['What clue did he see?', ['🔴 A red tip under the rug', '👣 Big steps', '🪶 A feather'], 0],
        ['Who sat on the cap?', ['🐰 Zip', '🐸 Plip', '🐶 Toasty'], 0]
      ] },
    { title: 'The Missing Snack', emoji: '🐟',
      text: `Biscuit had a fish snack.

He set it on a box.

Then the snack was gone!

Biscuit saw wet steps on the mat.

The wet steps went to the pond.

Plip had the snack! "Yum," said Plip.`,
      qs: [
        ['What snack did Biscuit have?', ['🐟 A fish snack', '🍎 An apple', '🍪 A cookie'], 0],
        ['Where did he set it?', ['📦 On a box', '🛏️ On the bed', '🪑 On a chair'], 0],
        ['What clue did Biscuit find?', ['💧 Wet steps', '🔥 Smoke', '🌿 A leaf'], 0],
        ['Who had the snack?', ['🐸 Plip', '🐰 Zip', '🐥 Chip'], 0]
      ] }
  ],
  5: [
    { title: 'The Case of the Loud Bump', emoji: '🌙',
      text: `At night, Biscuit heard a loud BUMP. He put on his detective hat.

He went to the kitchen. A pot was on the floor, and it was still warm.

Warm pot? Biscuit thought of Toasty. But Toasty was in bed, snoring.

Then Biscuit saw a long ear by the shelf. It was Zip! "Sorry," she said. "I wanted a snack."`,
      qs: [
        ['What did Biscuit hear?', ['💥 A loud bump', '🎵 A song', '🐦 A bird'], 0],
        ['What was on the floor?', ['🍲 A warm pot', '📚 A book', '🧦 A sock'], 0],
        ['Why did Biscuit think of Toasty first?', ['🔥 The pot was warm', '🐾 He saw paw prints', '😴 Toasty was snoring'], 0],
        ['Who made the bump?', ['🐰 Zip', '🐶 Toasty', '🐸 Plip'], 0]
      ] },
    { title: 'Who Ate the Flowers?', emoji: '🌷',
      text: `Leafy had six red flowers. In the morning, three were gone!

"Detective Biscuit, can you help?" Leafy asked.

Biscuit looked at the dirt. He saw bunny tracks. "Tracks like these mean a bunny," he said.

Zip's face turned pink. "They were so yummy," she said. Then Zip helped Leafy plant new ones.`,
      qs: [
        ['How many flowers were gone?', ['3️⃣ Three', '1️⃣ One', '6️⃣ Six'], 0],
        ['Who asked Biscuit for help?', ['🌿 Leafy', '🐥 Chip', '🐶 Toasty'], 0],
        ['What clue was in the dirt?', ['🐰 Bunny tracks', '💧 A puddle', '🪶 A feather'], 0],
        ['How did Zip fix it?', ['🌱 She planted new flowers', '🏃 She ran away', '😴 She took a nap'], 0]
      ] }
  ],
  6: [
    { title: 'The Case of the Shiny Coin', emoji: '🪙',
      text: `Chip found a shiny coin. She put it on the windowsill so it would sparkle in the sun.

The next morning, the coin was gone! "Who took it?" Chip cried.

Detective Biscuit looked closely. The window was open. On the sill was a black feather.

"Plip has no feathers. Toasty has no feathers," said Biscuit. "But a crow does. And crows love shiny things."

They looked up in the tree. In a crow's nest was the coin, plus a key, a spoon, and a button!

Biscuit traded the crow a shiny bottle cap. The crow liked it even more.`,
      qs: [
        ['Where did Chip put the coin?', ['🪟 On the windowsill', '🛏️ Under the bed', '📦 In a box'], 0],
        ['What clue did Biscuit find?', ['🪶 A black feather', '👣 Wet steps', '🥕 A carrot'], 0],
        ['Why did Biscuit think it was a crow?', ['✨ Crows love shiny things and have feathers', '🎵 Crows sing', '🐸 Crows like ponds'], 0],
        ['How did Biscuit get the coin back?', ['🔁 He traded a bottle cap', '🧗 He climbed and grabbed it', '😠 He yelled at the crow'], 0]
      ] },
    { title: 'Two Snowman Mysteries', emoji: '⛄',
      text: `The Pocket Pals built a tall snowman with a carrot nose.

The next day, the snowman was much shorter, and the carrot nose was gone!

"Two mysteries," said Detective Biscuit. "Let's find two answers."

First, he looked at the sky. The sun was shining. There was a puddle around the snowman. "The sun melted him," Biscuit said. "That's why he is short."

Then he looked at the snow. He saw hoof prints leading to the woods. At the end of the tracks, a deer was munching the carrot!

"Case closed," said Biscuit. "Both cases!"`,
      qs: [
        ['What two things were wrong with the snowman?', ['📉 It was shorter and the nose was gone', '🎩 Its hat was red', '❄️ It had two noses'], 0],
        ['Why did the snowman get shorter?', ['☀️ The sun melted it', '🐰 Zip ate it', '💨 The wind blew it'], 0],
        ['What clue led to the nose?', ['🦌 Hoof prints', '🪶 A feather', '🔴 A red tip'], 0],
        ['Who had the carrot?', ['🦌 A deer', '🐰 Zip', '🐶 Toasty'], 0]
      ] }
  ],
  7: [
    { title: 'The Case of the Silent Bell', emoji: '🔔',
      text: `Biscuit loved the bell on his bike. Ring, ring! But one morning, the bell made no sound at all. It just went "clunk."

Biscuit put on his detective hat and got his magnifying glass. He looked inside the bell. It was full of thin, sticky threads.

"Threads like these come from a spider," he said. "A spider made a web in my bell!"

Sure enough, a tiny brown spider peeked out. She looked very cozy.

Biscuit did not want to hurt her. He held a flowerpot next to the bell, and the spider walked right in.

Now the spider has a new home, and Biscuit's bell rings again. Ring, ring!`,
      qs: [
        ['What was wrong with the bell?', ['🔕 It did not ring', '💥 It was too loud', '🔵 It turned blue'], 0],
        ['What tool did Biscuit use?', ['🔍 A magnifying glass', '🔨 A hammer', '🪜 A ladder'], 0],
        ['What clue did he find inside the bell?', ['🕸️ Sticky threads', '💧 Water', '🪶 A feather'], 0],
        ['How did Biscuit help the spider?', ['🪴 He gave her a flowerpot home', '🧹 He swept her away', '🚲 He rode fast'], 0],
        ['What does this show about Biscuit?', ['💛 He is kind and smart', '😠 He is grumpy', '😴 He is lazy'], 0]
      ] },
    { title: 'The Case of the Backward Footprints', emoji: '🐾',
      text: `It had rained all morning. Biscuit saw muddy paw prints on the porch. They went into the house, but no prints came back out.

"Someone is still inside," said Chip, hiding behind Biscuit.

Biscuit looked closer. In front of each paw print was a long, thin line in the mud. "That line was made by a tail," he said. "But a tail drags behind you, not in front of you."

He thought hard. Then he smiled. "These prints were made by someone walking backward! They are not going in. They are going out."

Just then, Toasty peeked over the fence, giggling. "I wanted to trick a detective," he said.

"Nice try," said Biscuit. "But the tail tells the tale."`,
      qs: [
        ['Where did Biscuit see the muddy prints?', ['🏠 On the porch', '🏖️ At the beach', '🚌 On the bus'], 0],
        ['Why was Chip scared?', ['😨 She thought someone was still inside', '⛈️ It was raining', '🐶 Toasty barked'], 0],
        ['What was the important clue?', ['〰️ A tail line in front of the prints', '🪶 A feather', '💧 A puddle'], 0],
        ['What did Biscuit figure out?', ['🔙 Someone walked out backward', '🏠 Someone was in the house', '🐸 Plip made the prints'], 0],
        ['Who played the trick?', ['🐶 Toasty', '🐰 Zip', '🌿 Leafy'], 0]
      ] },
    { title: 'The Case of the Missing Present', emoji: '🎁',
      text: `It was Chip's birthday. Biscuit had wrapped a present for her and hidden it under his bed.

But when he looked, the present was gone! All he found was a trail of sparkly glitter on the floor.

Detective Biscuit followed the glitter. It went down the hall, out the door, and across the yard. It led all the way to Leafy's garden shed.

Biscuit opened the door slowly. "SURPRISE!" shouted all of his friends. The shed was full of balloons, streamers, and a big cake.

"We moved your present here for the party," said Zip. "We used glitter on the decorations, and some fell off."

"So the clue was an accident," Biscuit laughed. "This is the best case ever."`,
      qs: [
        ['Whose birthday was it?', ['🐥 Chip\'s', '🐱 Biscuit\'s', '🐸 Plip\'s'], 0],
        ['Where did Biscuit hide the present?', ['🛏️ Under his bed', '🌳 In a tree', '📦 In the shed'], 0],
        ['What clue did Biscuit follow?', ['✨ A glitter trail', '👣 Muddy prints', '🪶 Feathers'], 0],
        ['Where did the trail lead?', ['🏚️ Leafy\'s garden shed', '🏖️ The beach', '🏫 The school'], 0],
        ['Why was there glitter on the floor?', ['🎉 It fell off the party decorations', '🐦 A bird dropped it', '🌧️ The rain brought it'], 0]
      ] }
  ],
  8: [
    { title: 'The Case of the Midnight Music', emoji: '🎶',
      text: `Every night that week, Biscuit heard strange music. Hoooo. Wheeee. Hoooo. It sounded like a ghost singing a song.

Zip hid under her blanket. Chip would not go outside after dark. "It's a ghost!" said Plip.

"Detectives don't believe in ghosts," said Biscuit. "They believe in clues."

So Biscuit made a list of facts. Fact one: the music only played at night. Fact two: it was loudest on windy nights. Fact three: on the one night with no wind, there was no music at all.

"The wind is part of this mystery," Biscuit said.

He took his flashlight and followed the sound to the back fence. There, in a long row, were six empty glass bottles. Plip had lined them up there after a picnic.

When the wind blew across the tops of the bottles, they sang. Hoooo. Wheeee.

"The ghost is just bottles and wind," Biscuit said. He blew across the top of one himself to show everyone. Hoooo!

Zip came out from under her blanket and laughed. Then the Pocket Pals had a better idea. They filled each bottle with a different amount of water and made a real band.

Now the fence plays music on purpose, and nobody is scared.`,
      qs: [
        ['What did the strange music sound like?', ['👻 A ghost singing', '🐶 A dog barking', '🚂 A train'], 0],
        ['What do detectives believe in, according to Biscuit?', ['🔍 Clues', '👻 Ghosts', '🍀 Luck'], 0],
        ['Which fact was the biggest clue?', ['💨 No wind meant no music', '🌙 The moon was full', '🐸 Plip was sleepy'], 0],
        ['What was really making the music?', ['🍾 Wind blowing across bottles', '🐦 Birds', '📻 A radio'], 0],
        ['How did the story end?', ['🎵 They made a bottle band', '🏃 They moved away', '😨 They stayed scared'], 0]
      ] },
    { title: 'The Case of the Lucky Rock', emoji: '🪨',
      text: `Toasty had a lucky rock. It was smooth and red, with a white stripe like a lightning bolt. He carried it everywhere.

One afternoon, Toasty ran to Biscuit's house. His tail was drooping. "I lost my lucky rock at the park!" he cried. "I've looked everywhere."

Biscuit put on his detective hat. "Let's go back and walk the same path you walked," he said. "That's called retracing your steps."

At the park, Toasty showed him the swings, the slide, and the bench where he ate lunch. No rock.

Then Biscuit noticed something. Toasty's paws were covered with sand. "Toasty, did you go to the sandbox?"

"Oh, yes," said Toasty. "I built a giant sand castle. I forgot about that."

They raced to the sandbox. The castle was still there, with a tall tower on top. Biscuit looked carefully at the tower. Near the top was a tiny red window with a white stripe.

"There's your lucky rock," said Biscuit. "You used it as a window."

Toasty gently pulled it out and hugged it. "You're the best detective ever."

"I just followed the sand," said Biscuit. "Clues are everywhere, if you look."`,
      qs: [
        ['What did Toasty\'s lucky rock look like?', ['🔴 Red with a white stripe', '🔵 Blue and round', '⚫ Black and sharp'], 0],
        ['What does "retracing your steps" mean?', ['🔁 Going back the way you went', '🏃 Running fast', '🦶 Washing your feet'], 0],
        ['What clue did Biscuit notice?', ['🏖️ Sand on Toasty\'s paws', '💧 A puddle', '🪶 A feather'], 0],
        ['Where was the rock?', ['🏰 In the sand castle tower', '🪑 Under the bench', '🛝 On the slide'], 0],
        ['What lesson does Biscuit share?', ['🔍 Clues are everywhere if you look', '🍀 Rocks bring luck', '🏖️ Never play in sand'], 0]
      ] },
    { title: 'The Case of the Painted Fence', emoji: '🎨',
      text: `Leafy painted a beautiful picture on the backyard fence. It had a yellow sun, green hills, and a big rainbow. Everyone loved it.

The next morning, there were blue smudges all over the rainbow! Leafy was very upset. "Who would ruin my painting?" she asked.

Detective Biscuit studied the smudges with his magnifying glass. They were small, round marks, and each one had four tiny lines.

"These are not brush marks," he said. "These are prints. Small paw prints, with four toes."

He checked his friends. Zip's paws were clean. Toasty's paws were clean. Plip had webbed feet, which would leave a different shape.

Then Biscuit looked down at the grass. Next to the fence was a tipped-over cup of blue paint. Little blue prints led away from it, up the tree, and onto a branch.

On the branch sat a squirrel with bright blue feet.

"The squirrel stepped in the paint," said Biscuit. "Then it ran across the fence to get to the tree. It wasn't trying to ruin anything. It was an accident."

Leafy looked at the squirrel and couldn't stay mad. Then she had an idea. She turned every blue paw print into a tiny blue flower.

"Now my painting is even better," she said. And the squirrel seemed to agree.`,
      qs: [
        ['What was on the painted fence?', ['🌈 A sun, hills, and a rainbow', '🐱 A cat', '🏠 A house'], 0],
        ['What did Biscuit notice about the smudges?', ['🐾 They were paw prints with four toes', '🖌️ They were brush lines', '💧 They were raindrops'], 0],
        ['Why wasn\'t it Plip?', ['🐸 His webbed feet make a different shape', '😴 He was asleep', '🏊 He was swimming'], 0],
        ['Who made the marks?', ['🐿️ A squirrel', '🐰 Zip', '🐶 Toasty'], 0],
        ['How did Leafy fix the painting?', ['🌸 She turned the prints into flowers', '🧽 She scrubbed it off', '🎨 She painted it all blue'], 0]
      ] }
  ]
};

// Wire mysteries into the track: tag series, extend levels 7–8.
SON_TRACK.series = { pals: { name: 'Biscuit & Pals', emoji: '🐱' }, detective: { name: 'Detective Biscuit', emoji: '🔍' } };
SON_TRACK.levels.forEach(L => { if (L.kind === 'story') L.stories.forEach(s => { s.series = s.series || 'pals'; }); });
SON_TRACK.levels.push(
  { n: 7, title: 'Chapter Mysteries', kind: 'story', stories: [] },
  { n: 8, title: 'Super Sleuth', kind: 'story', stories: [] }
);
for (const [n, list] of Object.entries(SON_DETECTIVE)) {
  list.forEach(s => s.series = 'detective');
  SON_TRACK.levels[n - 1].stories.push(...list);
}

// Legendary Pocket Pals: [emoji, name, type, level they unlock at]
SON_TRACK.rewards.push(
  ['🤖','Gizmo Bot',null,4], ['🐉','Sky Serpent',null,5], ['🦄','Glimmerhorn',null,6],
  ['🥷','Shadow Pup',null,7], ['👑','King Fluff',null,8]
);

/* ============================================================
   MILES — "Read with Biscuit" starter stories for Levels 1–3,
   so every level has a real story next to the letter/word drill.
   Emoji on a page are picture clues: shown, never scored.
   ============================================================ */
const SON_STARTER = {
  1: [
    { title: 'What Biscuit Sees', emoji: '👀',
      text: `I see a cat. 🐱 The cat is on a mat.

I see a dog. 🐶 The dog can sit.

I see a pig. 🐷 The pig is in the mud.

I look up. I see a sun. ☀️ The sun is hot.

I look down. I see a bug! 🐞 The bug is red. Hi, bug!`,
      qs: [
        ['What did Biscuit see first?', ['🐱 A cat', '🐟 A fish', '🚗 A car'], 0],
        ['What did he see in the sky?', ['☀️ The sun', '🌙 The moon', '🎈 A balloon'], 0],
        ['What did he see last?', ['🐞 A bug', '🐷 A pig', '🐶 A dog'], 0]
      ] },
    { title: 'I Like My Things', emoji: '❤️',
      text: `I like my hat. 🎩 It is red.

I like my dog. 🐶 My dog can run.

I like my bed. 🛏️ I nap in my bed.

I like my cup. 🥤 It is big.

I like my things a lot. But I like my mom the most! ❤️`,
      qs: [
        ['What does he like to wear?', ['🎩 A hat', '🧤 Mittens', '👟 Shoes'], 0],
        ['Where does he sleep?', ['🛏️ In his bed', '🌳 In a tree', '🛁 In the tub'], 0],
        ['Who does he like at the end?', ['❤️ His mom', '🐷 A pig', '🐞 A bug'], 0]
      ] },
    { title: 'Look at Me!', emoji: '🙌',
      text: `Look at the fox. 🦊 The fox can run.

Look at the hen. 🐔 The hen can sit on an egg.

Look at the frog. 🐸 The frog can hop.

Look at the bus. 🚌 We can get on the bus.

Can you see me? I can run, sit, and hop. Look at me! 😺`,
      qs: [
        ['Which animal says "cluck"?', ['🐔 The hen', '🦊 The fox', '🐸 The frog'], 0],
        ['What can you ride in?', ['🚌 The bus', '🐸 The frog', '🦊 The fox'], 0],
        ['Who is "me" at the end?', ['😺 Biscuit', '🐔 The hen', '🚌 The bus'], 0]
      ] }
  ],
  2: [
    { title: 'The Big Pig', emoji: '🐷',
      text: `A pig is big. 🐷 The pig has a pink nose.

The big pig is in the mud. The mud is wet.

The pig can dig and dig. Dig, pig, dig!

Biscuit can not dig. 🐱 He sat on a log in the sun.

The pig got mud on his back. He got mud on his legs. The pig is a big mess! 😂`,
      qs: [
        ['Where is the pig?', ['🟫 In the mud', '🛁 In the tub', '🌳 In a tree'], 0],
        ['What can the pig do?', ['⛏️ Dig', '🦅 Fly', '🏊 Swim'], 0],
        ['How does the pig look at the end?', ['😂 Like a big mess', '✨ Very clean', '😴 Asleep'], 0]
      ] },
    { title: 'Zip and the Jet', emoji: '🚀',
      text: `Zip has a red jet. 🐰 It is not big.

Zip sat in the jet. She had a hat on.

The jet can zip up, up, up! 🚀 It went up to the top.

Zip sees the sun. ☀️ Zip sees a hill and a pond. The pond is not big from up here!

The jet came down. It did a bump on the grass. Zip got out. The jet is fun!`,
      qs: [
        ['What color is the jet?', ['🔴 Red', '🔵 Blue', '🟢 Green'], 0],
        ['Which way did the jet go?', ['⬆️ Up, up, up', '⬇️ Down', '↩️ Back'], 0],
        ['What did Zip see?', ['☀️ The sun', '🐷 A pig', '🌧️ Rain'], 0]
      ] },
    { title: 'Ten Hens', emoji: '🐔',
      text: `Ten hens sat in a pen. 🐔 The hens had ten eggs.

A fox ran to the pen! 🦊 The fox had a big grin.

The hens ran and hid. Six hid in a box. Four hid in a bin.

Toasty ran at the fox. 🐶 "Get out, fox!" said Toasty. "Ruff, ruff!"

The fox ran off. He ran up the hill and into his den. The hens are glad! They sat on the eggs.`,
      qs: [
        ['How many hens were there?', ['🔟 Ten', '2️⃣ Two', '5️⃣ Five'], 0],
        ['Who ran to the pen?', ['🦊 A fox', '🐷 A pig', '🐱 Biscuit'], 0],
        ['Who helped the hens?', ['🐶 Toasty', '🐰 Zip', '🐸 Plip'], 0]
      ] }
  ],
  3: [
    { title: 'Come and Play', emoji: '🤸',
      text: `It is a sunny day. "Come and play," said Zip. 🐰

"We can run," said Plip. 🐸 "Look at me go!"

"We can jump," said Toasty. 🐶 "I can jump up high!"

Biscuit came out to see his friends. "I like to play with you," said Biscuit. 🐱

They all run. They all jump. Then they sit down in the grass. "That was fun," said Zip. "Can we play one more time?" Here we go!`,
      qs: [
        ['Who said "Come and play"?', ['🐰 Zip', '🐱 Biscuit', '🐶 Toasty'], 0],
        ['What did Toasty want to do?', ['🦘 Jump', '😴 Sleep', '🍪 Eat'], 0],
        ['How does Biscuit feel about his friends?', ['😊 He likes to play with them', '😠 He is mad', '😢 He is sad'], 0]
      ] },
    { title: 'Where Is My Ball?', emoji: '⚽',
      text: `I have a blue ball. 🔵 I like to play with it. But where is my blue ball?

Is it here in my room? No.

Is it down there under the bed? No. I see a sock, but not my ball.

Is it in the yard? I go out to look. Look! It is up in the tree! 🌳

I can not get it down. It is too high for me. Zip can help me get it down. 🐰 She can jump up and get it!`,
      qs: [
        ['What color is the ball?', ['🔵 Blue', '🔴 Red', '🟡 Yellow'], 0],
        ['Where was the ball?', ['🌳 Up in the tree', '🛏️ Under the bed', '🏊 In the pond'], 0],
        ['Who will help get it?', ['🐰 Zip', '🐸 Plip', '🐔 A hen'], 0]
      ] },
    { title: 'One, Two, Three!', emoji: '🔢',
      text: `One, two, three. Jump with me! 🦘

Biscuit can jump. 🐱 He can jump up on a box.

Chip can jump. 🐥 She is little, but she can jump too.

Look at the funny frog jump! 🐸 He jumps so high. He jumps with his legs out. We all laugh.

Now we can all jump. One, two, three! We all jump and jump and jump!`,
      qs: [
        ['What do they count to?', ['3️⃣ Three', '🔟 Ten', '5️⃣ Five'], 0],
        ['What are they doing?', ['🦘 Jumping', '🏊 Swimming', '😴 Sleeping'], 0],
        ['Which jumper is funny?', ['🐸 The frog', '🐱 Biscuit', '🐥 Chip'], 0]
      ] }
  ]
};
// More starter stories so Levels 1–3 don't repeat so often.
SON_STARTER[1].push(
  { title: 'Biscuit Can Hop', emoji: '🐾',
    text: `I can hop. 🐱 Hop, hop, hop!

I can run. I run to the tree.

I can sit. I sit on a red mat.

I can nap in the sun. ☀️ The sun is hot. I like it.

Here is my pal. My pal is a dog. I can hug my pal! 🤗`,
    qs: [
      ['What can Biscuit do first?', ['🦘 Hop', '✈️ Fly', '🏊 Swim'], 0],
      ['Where does he nap?', ['☀️ In the sun', '🛁 In the tub', '🚗 In a car'], 0],
      ['What does he do last?', ['🤗 Hug his pal', '🍪 Eat a cookie', '📖 Read a book'], 0]
    ] },
  { title: 'The Red Bus', emoji: '🚌',
    text: `Zip is on a bus. 🚌 Zip has a bag.

The bus is red. It is a big bus.

The bus can go. Go, bus, go!

The bus can stop. 🛑 A dog gets on. A cat gets on.

The bus can go and go. Then it stops. Zip gets off. Zip is at the park! 🌳`,
    qs: [
      ['Who is on the bus?', ['🐰 Zip', '🐸 Plip', '🐶 Toasty'], 0],
      ['What color is the bus?', ['🔴 Red', '🔵 Blue', '🟢 Green'], 0],
      ['Where does Zip go?', ['🌳 To the park', '🏫 To school', '🏖️ To the beach'], 0]
    ] }
);
SON_STARTER[2].push(
  { title: 'Fox in a Box', emoji: '🦊',
    text: `A fox sat in a box. 🦊 It was a big box.

The box had a lid. The lid was up on top.

The fox did a big yawn. Then the lid fell on top! Bam!

The fox did not like it. It was dim in the box. "Help!" said the fox.

Biscuit ran to the box. Biscuit got the lid off. The fox ran to his den. 🏠 "Thank you!" said the fox.`,
    qs: [
      ['Where did the fox sit?', ['📦 In a box', '🌳 In a tree', '🛁 In a tub'], 0],
      ['What fell on top?', ['🟫 The lid', '🍎 An apple', '🎩 A hat'], 0],
      ['Who got the lid off?', ['🐱 Biscuit', '🐰 Zip', '🐔 A hen'], 0]
    ] },
  { title: 'Plip and the Bug', emoji: '🐛',
    text: `Plip is a frog. 🐸 Plip is wet and green.

Plip sat on a big log. The log is in the pond.

A bug sat on the log. 🐛 The bug had six legs.

Plip did a big hop. Hop! But the bug ran fast.

The bug ran up a stick. Plip did not get it. Plip sat back on the log. The sun was hot. Plip had a nap. 😴`,
    qs: [
      ['What is Plip?', ['🐸 A frog', '🐶 A pup', '🐷 A pig'], 0],
      ['What sat on the log with Plip?', ['🐛 A bug', '🦊 A fox', '🐱 A cat'], 0],
      ['What did Plip do at the end?', ['😴 Had a nap', '🏃 Ran home', '🍕 Ate pizza'], 0]
    ] }
);
SON_STARTER[3].push(
  { title: 'Help Me, Please!', emoji: '🐥',
    text: `Chip went up a big tree. She went up, up, up.

"Help me!" said Chip. 🐥 "I can not get down. It is too high!"

Zip and Plip came to the tree. "We will help you," said Zip and Plip.

They made a big pile of leaves. 🍂 It was soft and red and yellow.

"Jump!" they said. Chip jumped down into the leaves. She was OK! "Thank you!" she said. Then they all played in the leaves.`,
    qs: [
      ['Who needed help?', ['🐥 Chip', '🐰 Zip', '🐱 Biscuit'], 0],
      ['What did they make?', ['🍂 A pile of leaves', '🪜 A ladder', '🎂 A cake'], 0],
      ['What did Chip say at the end?', ['🙏 Thank you!', '👋 Goodbye!', '😴 Good night!'], 0]
    ] },
  { title: 'What Is in the Box?', emoji: '🎁',
    text: `Look! A big box is here. 📦 It has my name on it.

What is in it? I shake it. It does not make a sound.

Is it a ball? No.

Is it a hat? No. Is it a little car? No.

I open the box. It is a little cake for me! 🎂 Today is my birthday! My friends come to see me. We all play and eat.`,
    qs: [
      ['What is here?', ['📦 A big box', '🚌 A bus', '🐸 A frog'], 0],
      ['Was it a ball?', ['🙅 No', '👍 Yes', '🤷 Maybe'], 0],
      ['What was in the box?', ['🎂 A little cake', '🎩 A hat', '⚽ A ball'], 0]
    ] }
);
SON_TRACK.series.starter = { name: 'Read with Biscuit', emoji: '📗' };
for (const [n, list] of Object.entries(SON_STARTER)) {
  const L = SON_TRACK.levels[n - 1];
  L.stories = list.map(s => Object.assign(s, { series: 'starter' }));
}

/* ============================================================
   PHONICS PATH — original structured-literacy lessons.
   Progression modeled on the Stage 0–4 ladder in Dan's training list
   (letter sounds → CVC → digraphs/blends/endings → silent-e/vowel teams/
   r-controlled → multisyllable/affixes/contractions). All text is original;
   no book text is used.

   Lesson fields:
     id, stage, title, show (pattern shown big), say (spoken intro),
     ex: [[word, emoji]...]   example words for the Learn card
     words: [...]             Blend & Read words (decodable with taught patterns)
     build: [...]             words to spell with tiles (string, or array of chunks)
     heart: [[word, trickyPart, tip]]   irregular high-frequency words
     text: `...`              decodable passage (blank line = new page)
     qs: [[q, [opts], correctIndex]]
   Stage 0 lessons use letters: [[letter, sayString, keyword, emoji]] instead.
   ============================================================ */
const PHONICS_STAGES = [
  { n:0, name:'Letter Sounds',     icon:'🔤', desc:'What sound does each letter make?' },
  { n:1, name:'First Words',       icon:'🐣', desc:'Blend sounds into short words: c-a-t, cat!' },
  { n:2, name:'Sound Teams',       icon:'🤝', desc:'sh, ch, th, blends, and word endings' },
  { n:3, name:'Vowel Power',       icon:'⚡', desc:'Magic e, vowel teams, and bossy r' },
  { n:4, name:'Big Words',         icon:'🏔️', desc:'Two-part words, prefixes, suffixes, and real reading' }
];

const PHONICS = [
  /* ---------------- Stage 0: letter sounds ---------------- */
  { id:'0-1', stage:0, title:'s a t p i n', show:'s a t p i n',
    say:'These six letters are super helpers. Once you know them, you can read lots of words!',
    letters:[['s','sss','sun','☀️'],['a','aah','apple','🍎'],['t','tuh','turtle','🐢'],['p','puh','pig','🐷'],['i','ih','itch','🦟'],['n','nnn','nest','🪺']] },
  { id:'0-2', stage:0, title:'m d g o c k', show:'m d g o c k',
    say:'Six more letter sounds. Listen closely to each one!',
    letters:[['m','mmm','moon','🌙'],['d','duh','dog','🐶'],['g','guh','goat','🐐'],['o','ah','octopus','🐙'],['c','kuh','cat','🐱'],['k','kuh','kite','🪁']] },
  { id:'0-3', stage:0, title:'e u r h b f l', show:'e u r h b f l',
    say:'Here come seven more sounds, including two vowels: e and u.',
    letters:[['e','eh','egg','🥚'],['u','uh','umbrella','☂️'],['r','rrr','rocket','🚀'],['h','huh','hat','🎩'],['b','buh','ball','⚽'],['f','fff','fish','🐟'],['l','lll','lion','🦁']] },
  { id:'0-4', stage:0, title:'j v w x y z', show:'j v w x y z',
    say:'The last letters! Now you know every letter sound.',
    letters:[['j','juh','jam','🍓'],['v','vvv','van','🚐'],['w','wuh','web','🕸️'],['x','ks','fox','🦊'],['y','yuh','yo-yo','🪀'],['z','zzz','zebra','🦓']] },

  /* ---------------- Stage 1: first decoding (CVC) ---------------- */
  { id:'1-1', stage:1, title:'Short a', show:'a', say:'The letter a says aah, like at the start of apple.',
    ex:[['cat','🐱'],['map','🗺️'],['bag','👜']], words:['cat','map','sad','ham','tap','bag'], build:['cat','map','bag'],
    heart:[['the','e','The e in "the" says uh.']],
    text:`Sam has a cat.

The cat sat on a mat.

Pat the cat, Sam!`,
    qs:[['Who has a cat?',['🧒 Sam','🐶 A dog','🐟 A fish'],0],['Where did the cat sit?',['🟫 On a mat','🛏️ On a bed','🌳 In a tree'],0]] },
  { id:'1-2', stage:1, title:'Short i', show:'i', say:'The letter i says ih, like at the start of itch.',
    ex:[['pig','🐷'],['fin','🦈'],['six','6️⃣']], words:['pig','sit','win','lip','big','fin'], build:['pig','sit','fin'],
    heart:[['is','s','The s in "is" says zzz.']],
    text:`Tim is big.

Tim and the pig sit.

The pig did a jig!`,
    qs:[['Who sits with Tim?',['🐷 The pig','🐱 A cat','🐸 A frog'],0],['What did the pig do?',['💃 A jig','😴 A nap','🏊 A swim'],0]] },
  { id:'1-3', stage:1, title:'Short o', show:'o', say:'The letter o says ah, like at the start of octopus.',
    ex:[['dog','🐶'],['pot','🍲'],['log','🪵']], words:['dog','hot','mop','top','log','pot'], build:['dog','mop','pot'],
    heart:[['to','o','The o in "to" says oo.']],
    text:`The dog got on a log.

Mom has a hot pot.

Tom ran to the dog.`,
    qs:[['Where did the dog get on?',['🪵 A log','🚗 A car','🛏️ A bed'],0],['What does Mom have?',['🍲 A hot pot','🎈 A balloon','📕 A book'],0]] },
  { id:'1-4', stage:1, title:'Short u', show:'u', say:'The letter u says uh, like at the start of umbrella.',
    ex:[['sun','☀️'],['bug','🐛'],['cup','🥤']], words:['sun','bug','cup','run','tub','hut'], build:['sun','bug','cup'],
    heart:[['of','of','In "of", o says uh and f says vvv.']],
    text:`The sun is up.

A bug is in the cup.

Run, bug, run!`,
    qs:[['Where is the bug?',['🥤 In the cup','🛁 In the tub','🌳 In a tree'],0],['What is up in the sky?',['☀️ The sun','🌙 The moon','🎈 A balloon'],0]] },
  { id:'1-5', stage:1, title:'Short e', show:'e', say:'The letter e says eh, like at the start of egg.',
    ex:[['hen','🐔'],['bed','🛏️'],['web','🕸️']], words:['hen','bed','red','ten','pet','web'], build:['bed','hen','web'],
    heart:[['said','ai','The ai in "said" says eh.']],
    text:`Ten hens sat in a red bed.

"Get up!" said Meg.

The hens did not get up.`,
    qs:[['How many hens?',['🔟 Ten','2️⃣ Two','5️⃣ Five'],0],['Did the hens get up?',['🙅 No','👍 Yes','🏃 They ran'],0]] },
  { id:'1-6', stage:1, title:'Mix it up!', show:'a e i o u', say:'Now all five short vowels together. Look carefully at the middle letter!',
    ex:[['fox','🦊'],['jam','🍓'],['zip','🤐']], words:['jam','fix','hop','bud','vet','zip'], build:['fox','zip','jam'],
    heart:[['was','as','In "was", a says uh and s says zzz.']],
    text:`Max was a fox.

Max had a red van.

Zip! The van ran up the hill.`,
    qs:[['What kind of animal is Max?',['🦊 A fox','🐶 A dog','🐷 A pig'],0],['What color is the van?',['🔴 Red','🔵 Blue','🟢 Green'],0]] },

  /* ---------------- Stage 2: building phonics ---------------- */
  { id:'2-1', stage:2, title:'sh', show:'sh', say:'When s and h are together, they say shhh, like at the start of ship.',
    ex:[['ship','🚢'],['fish','🐟'],['shell','🐚']], words:['ship','shop','fish','dish','shed','wish'], build:['ship','fish','shed'],
    heart:[['they','ey','The ey in "they" says ay.']],
    text:`A fish is in a dish.

They wish to get a ship.

The ship is in the shop.`,
    qs:[['Where is the fish?',['🍽️ In a dish','🌊 In the sea','🛁 In a tub'],0],['What do they wish for?',['🚢 A ship','🎂 A cake','🐶 A pup'],0]] },
  { id:'2-2', stage:2, title:'ch', show:'ch', say:'When c and h are together, they say ch, like at the start of chick.',
    ex:[['chick','🐥'],['chip','🍟'],['bench','🪑']], words:['chip','chop','chin','chat','much','rich'], build:['chip','chin','chop'],
    heart:[['what','a','The a in "what" says uh.']],
    text:`Chad has a chip.

What a big chip!

Chop, chop, chop! Now Chad has ten chips.`,
    qs:[['What does Chad have?',['🍟 A chip','🍦 Ice cream','🍕 Pizza'],0],['How many chips at the end?',['🔟 Ten','1️⃣ One','3️⃣ Three'],0]] },
  { id:'2-3', stage:2, title:'ck', show:'ck', say:'At the end of a short word, c and k team up to say kuh, like in duck.',
    ex:[['duck','🦆'],['sock','🧦'],['clock','🕰️']], words:['duck','sock','kick','back','pack','neck'], build:['duck','sock','back'],
    heart:[['put','u','The u in "put" says oo, like in book.']],
    text:`Jack has a red sock.

Put the sock in the pack.

Quack! A duck got the sock!`,
    qs:[['What color is the sock?',['🔴 Red','🟡 Yellow','⚫ Black'],0],['Who got the sock?',['🦆 A duck','🐶 A dog','🧒 Jack'],0]] },
  { id:'2-4', stage:2, title:'th', show:'th', say:'When t and h are together, they say th. Stick your tongue out a tiny bit: th, like in thumb.',
    ex:[['thumb','👍'],['bath','🛁'],['three','3️⃣']], words:['this','that','then','thin','bath','with'], build:['bath','thin','with'],
    heart:[['from','o','The o in "from" says uh.']],
    text:`This is Beth.

Beth is in the bath with a duck.

The duck is from the shop.`,
    qs:[['Where is Beth?',['🛁 In the bath','🏫 At school','🌳 In the park'],0],['Where is the duck from?',['🏪 The shop','🌊 The pond','🏠 Next door'],0]] },
  { id:'2-5', stage:2, title:'wh and ng', show:'wh  ng', say:'wh says wuh, like in whale. And ng says the sound at the end of ring.',
    ex:[['whale','🐋'],['ring','💍'],['king','🤴']], words:['when','which','whip','ring','sing','long'], build:['ring','sing','whip'],
    heart:[['do','o','The o in "do" says oo.']],
    text:`When can we sing?

We sing a long song.

Ding, dong! Ring the bell!`,
    qs:[['What do they do?',['🎵 Sing a song','🏃 Run a race','🍳 Cook'],0],['What sound does the bell make?',['🔔 Ding, dong','🐶 Woof','💥 Boom'],0]] },
  { id:'2-6', stage:2, title:'Blends at the start', show:'fr  st  cl  sw', say:'Some words start with two sounds blended together, like f and r in frog. Say both sounds fast!',
    ex:[['frog','🐸'],['star','⭐'],['clap','👏']], words:['frog','stop','clap','swim','flag','drum'], build:['frog','stop','flag'],
    heart:[['come','o','In "come", o says uh and the e is quiet.']],
    text:`A frog can swim.

Come and clap for the frog!

Stop, frog, stop! The frog hops on a flag.`,
    qs:[['What can the frog do?',['🏊 Swim','✈️ Fly','📖 Read'],0],['Where did the frog hop?',['🚩 On a flag','🌳 In a tree','🛏️ On a bed'],0]] },
  { id:'2-7', stage:2, title:'Blends at the end', show:'mp  nd  st  lk', say:'Some words end with two sounds blended, like m and p in jump.',
    ex:[['jump','🦘'],['hand','✋'],['tent','⛺']], words:['jump','hand','lamp','nest','milk','tent'], build:['jump','nest','tent'],
    heart:[['want','a','The a in "want" says ah.']],
    text:`I want to jump on the bed!

The lamp is on the desk.

An egg is in the nest.`,
    qs:[['What does the kid want to do?',['🦘 Jump on the bed','😴 Sleep','🍪 Eat'],0],['What is in the nest?',['🥚 An egg','🐟 A fish','🧦 A sock'],0]] },
  { id:'2-8', stage:2, title:'Endings: -s -es -ing -ed', show:'-s  -es  -ing  -ed', say:'Endings change a word. One cat, two cats. I jump, I am jumping, I jumped!',
    ex:[['cats','🐱🐱'],['jumping','🦘'],['dishes','🍽️']], words:['cats','dogs','dishes','jumping','jumped','fished'], build:[['cat','s'],['jump','ing'],['dish','es']],
    heart:[['are','are','"Are" sounds like the letter r.']],
    text:`The cats are jumping.

The dog jumped in the mud.

The kids fished and fished, but no fish!`,
    qs:[['What are the cats doing?',['🦘 Jumping','😴 Sleeping','🍽️ Eating'],0],['Did the kids get a fish?',['🙅 No','👍 Yes, a big one','🐟 Ten fish'],0]] },

  /* ---------------- Stage 3: fluency bridge ---------------- */
  { id:'3-1', stage:3, title:'Magic e: a_e', show:'a_e', say:'A quiet e at the end is magic! It makes the a say its name: ay. Cap becomes cape!',
    ex:[['cake','🎂'],['lake','🏞️'],['gate','🚪']], words:['cake','lake','name','gate','tape','wave'], build:['cake','gate','tape'],
    heart:[['one','one','"One" sounds like "won".']],
    text:`Jake made a cake.

One cake for Kate!

They ate the cake by the lake.`,
    qs:[['What did Jake make?',['🎂 A cake','🪁 A kite','🚗 A car'],0],['Where did they eat it?',['🏞️ By the lake','🏫 At school','🚌 On a bus'],0]] },
  { id:'3-2', stage:3, title:'Magic e: i_e and o_e', show:'i_e  o_e', say:'Magic e works on i and o too! Kit becomes kite. Hop becomes hope.',
    ex:[['kite','🪁'],['bike','🚲'],['bone','🦴']], words:['bike','kite','time','home','rope','bone'], build:['kite','bone','rope'],
    heart:[['give','i','In "give", the i says ih, even with the e.']],
    text:`Mike rode his bike home.

Rose has a kite on a long rope.

Give the dog a bone!`,
    qs:[['How did Mike get home?',['🚲 On his bike','🚗 In a car','🚶 He walked'],0],['What does Rose have?',['🪁 A kite','🦴 A bone','🎂 A cake'],0]] },
  { id:'3-3', stage:3, title:'Magic e: u_e and e_e', show:'u_e  e_e', say:'With magic e, u says you, like in cube, and e says ee, like in these.',
    ex:[['cube','🧊'],['mule','🫏'],['flute','🪈']], words:['cute','mule','tube','cube','these','theme'], build:['cube','tube','cute'],
    heart:[['two','w','The w in "two" is quiet.']],
    text:`These two mules are cute.

The mules like to run in the dunes.

Then they nap in the shade.`,
    qs:[['How many mules?',['2️⃣ Two','1️⃣ One','🔟 Ten'],0],['What do the mules do at the end?',['😴 Nap in the shade','🏊 Swim','🍰 Eat cake'],0]] },
  { id:'3-4', stage:3, title:'ai and ay', show:'ai  ay', say:'a and i together say ay, like in rain. At the end of a word, a and y say ay, like in play.',
    ex:[['rain','🌧️'],['snail','🐌'],['play','🛝']], words:['rain','tail','mail','play','day','stay'], build:['rain','tail','play'],
    heart:[['four','our','The our in "four" says or.']],
    text:`It rains all day.

We stay in and play.

The cat wags its tail at the four of us.`,
    qs:[['What is the weather?',['🌧️ Rainy','☀️ Sunny','❄️ Snowy'],0],['What do they do inside?',['🎲 Play','🧹 Clean','😴 Sleep all day'],0]] },
  { id:'3-5', stage:3, title:'ee and ea', show:'ee  ea', say:'e and e together say ee, like in tree. e and a can say ee too, like in leaf.',
    ex:[['tree','🌳'],['sheep','🐑'],['leaf','🍃']], words:['tree','feet','sheep','seat','read','leaf'], build:['tree','sheep','leaf'],
    heart:[['friend','ie','The ie in "friend" says eh.']],
    text:`My friend has three sheep.

The sheep eat green grass by a big tree.

A leaf fell on a sheep. Peep!`,
    qs:[['How many sheep?',['3️⃣ Three','1️⃣ One','🔟 Ten'],0],['What do the sheep eat?',['🌿 Green grass','🍕 Pizza','🍦 Ice cream'],0]] },
  { id:'3-6', stage:3, title:'oa and ow', show:'oa  ow', say:'o and a together say oh, like in boat. o and w can say oh too, like in snow.',
    ex:[['boat','⛵'],['goat','🐐'],['snow','❄️']], words:['boat','goat','road','snow','grow','bowl'], build:['boat','goat','snow'],
    heart:[['door','oo','The oo in "door" says or.']],
    text:`A goat rows a boat in the snow.

The goat gets cold and goes home.

He shuts the door and eats a big bowl of oats.`,
    qs:[['What does the goat do in the snow?',['⛵ Rows a boat','🏂 Snowboards','🛷 Sleds'],0],['What does the goat eat at home?',['🥣 A bowl of oats','🍕 Pizza','🍎 An apple'],0]] },
  { id:'3-7', stage:3, title:'igh and y', show:'igh  y', say:'i, g, h together say eye, like in night. At the end of a short word, y says eye too, like in fly.',
    ex:[['night','🌙'],['light','💡'],['fly','🪰']], words:['night','light','high','fly','sky','my'], build:['light','high','fly'],
    heart:[['eye','eye','"Eye" sounds just like the letter i.']],
    text:`At night, the sky is black.

My light is bright.

I can see a kite fly up high, high, high!`,
    qs:[['What color is the night sky?',['⚫ Black','🔵 Blue','🟡 Yellow'],0],['What flies up high?',['🪁 A kite','🐟 A fish','🚗 A car'],0]] },
  { id:'3-8', stage:3, title:'Bossy r: ar and or', show:'ar  or', say:'When r comes after a vowel, it is bossy and changes the sound! a r says ar, like in car. o r says or, like in fork.',
    ex:[['car','🚗'],['star','⭐'],['corn','🌽']], words:['car','star','park','corn','fork','storm'], build:['car','star','fork'],
    heart:[['warm','ar','The ar in "warm" says or.']],
    text:`A star shines in the sky.

We drive the car to the park.

Oh no, a storm! We get in the warm car.`,
    qs:[['Where do they drive?',['🏞️ To the park','🏫 To school','🏪 To the store'],0],['Why do they get back in the car?',['⛈️ A storm comes','😴 They are tired','🍕 To eat'],0]] },
  { id:'3-9', stage:3, title:'Bossy r: er ir ur', show:'er  ir  ur', say:'These three teams all say the same sound: er, like in her, bird, and fur.',
    ex:[['bird','🐦'],['nurse','🧑‍⚕️'],['fern','🌿']], words:['her','bird','girl','fur','turn','fern'], build:['bird','turn','her'],
    heart:[['work','or','The or in "work" says er.']],
    text:`The girl has a pet bird.

Her bird can turn and twirl.

The girl and the bird work in the garden by the ferns.`,
    qs:[['What pet does the girl have?',['🐦 A bird','🐱 A cat','🐟 A fish'],0],['What can the bird do?',['🌀 Turn and twirl','🏊 Swim','📖 Read'],0]] },
  { id:'3-10', stage:3, title:'oi oy ou ow', show:'oi  oy  ou  ow', say:'oi and oy say oy, like in boy. ou and ow can say ow, like when you bump your toe: ow!',
    ex:[['coin','🪙'],['boy','👦'],['cow','🐄']], words:['coin','boy','toy','cloud','house','cow'], build:['coin','toy','cow'],
    heart:[['could','oul','The oul in "could" says oo, and the l is quiet.']],
    text:`The boy found a coin on the ground.

"Now I could get a toy cow!" he said.

He was so proud, he shouted, "Wow!"`,
    qs:[['What did the boy find?',['🪙 A coin','🐄 A cow','☁️ A cloud'],0],['What does he want to get?',['🐄 A toy cow','🚗 A toy car','🐶 A toy dog'],0]] },
  { id:'3-11', stage:3, title:'oo', show:'oo', say:'o and o together can say oo, like in moon. Sometimes they say a short oo, like in book.',
    ex:[['moon','🌙'],['zoo','🦁'],['book','📕']], words:['moon','food','zoo','book','look','foot'], build:['moon','book','zoo'],
    heart:[['school','ch','The ch in "school" says kuh.']],
    text:`Look at the moon!

After school, we read a book at the zoo.

The food at the zoo is so good.`,
    qs:[['Where do they read a book?',['🦁 At the zoo','🛏️ In bed','🚌 On the bus'],0],['How is the food?',['😋 Good','🤢 Yucky','🔥 Too hot'],0]] },

  /* ---------------- Stage 4: independent early reader ---------------- */
  { id:'4-1', stage:4, title:'Compound words', show:'sun + set', say:'Two small words can join to make one big word! Sun plus set makes sunset.',
    ex:[['sunset','🌅'],['cupcake','🧁'],['snowman','⛄']], words:['sunset','cupcake','rainbow','backpack','goldfish','snowman'], build:[['sun','set'],['cup','cake'],['snow','man']],
    heart:[['every','e','The second e in "every" is very quiet.']],
    text:`We packed a cupcake in my backpack.

At sunset, we saw a rainbow over the hill.

Every night, my goldfish swims in a circle.`,
    qs:[['What was in the backpack?',['🧁 A cupcake','🐟 A goldfish','⛄ A snowman'],0],['When did they see a rainbow?',['🌅 At sunset','🌙 At midnight','☀️ At breakfast'],0]] },
  { id:'4-2', stage:4, title:'Two-part words', show:'rab | bit', say:'Big words are made of parts called syllables. Read one part, then the next: rab, bit, rabbit!',
    ex:[['rabbit','🐇'],['picnic','🧺'],['kitten','🐈']], words:['rabbit','napkin','picnic','basket','muffin','kitten'], build:[['rab','bit'],['nap','kin'],['pic','nic']],
    heart:[['laugh','augh','The augh in "laugh" says aff.']],
    text:`A rabbit and a kitten had a picnic.

The basket had muffins and napkins.

The kitten told a joke, and the rabbit had to laugh!`,
    qs:[['Who had a picnic?',['🐇 A rabbit and a kitten','🐶 Two dogs','🐸 A frog'],0],['What was in the basket?',['🧁 Muffins and napkins','🍕 Pizza','🍎 Apples'],0]] },
  { id:'4-3', stage:4, title:'-le endings', show:'ap | ple', say:'When a word ends in a consonant plus l e, that last part says ul, like in apple and table.',
    ex:[['apple','🍎'],['turtle','🐢'],['candle','🕯️']], words:['apple','table','turtle','bubble','puzzle','candle'], build:[['ap','ple'],['ta','ble'],['can','dle']],
    heart:[['once','o','"Once" starts with a w sound: wuns.']],
    text:`Once, a turtle sat at a table.

It ate an apple and blew bubbles.

Then it did a puzzle by the light of a candle.`,
    qs:[['What did the turtle eat?',['🍎 An apple','🍰 Cake','🥕 A carrot'],0],['What did the turtle do last?',['🧩 A puzzle','🏊 Swam','😴 Slept'],0]] },
  { id:'4-4', stage:4, title:'Prefixes: un- and re-', show:'un-  re-', say:'A prefix goes at the front and changes the meaning. Un means not. Re means again. Unlock! Redo!',
    ex:[['unlock','🔓'],['redo','🔁'],['unhappy','☹️']], words:['undo','unlock','unhappy','redo','reread','repaint'], build:[['un','lock'],['re','do'],['re','paint']],
    heart:[['busy','u','The u in "busy" says ih.']],
    text:`The box was locked, so Max had to unlock it.

Oops! The puzzle fell, and he had to redo it.

Max was busy, but he was not unhappy. He liked it!`,
    qs:[['What did Max have to do to the box?',['🔓 Unlock it','🎨 Paint it','🗑️ Throw it away'],0],['How did Max feel?',['😊 Not unhappy, he liked it','😡 Angry','😢 Very sad'],0]] },
  { id:'4-5', stage:4, title:'Suffixes: -ful -less -ly', show:'-ful  -less  -ly', say:'A suffix goes at the end. Ful means full of. Less means without. Ly tells how something is done.',
    ex:[['helpful','🤝'],['quickly','⚡'],['fearless','🦁']], words:['helpful','careful','fearless','quickly','sadly','hopeless'], build:[['help','ful'],['fear','less'],['quick','ly']],
    heart:[['climb','b','The b in "climb" is quiet.']],
    text:`"Be careful!" said Mom.

The fearless cat ran quickly up the tree, but it could not climb down.

A helpful girl got a ladder and brought the cat down safely.`,
    qs:[['Where did the cat go?',['🌳 Up a tree','🏠 Into the house','🚗 Under a car'],0],['Who helped the cat?',['👧 A helpful girl','🐶 A dog','🚒 A firefighter'],0]] },
  { id:'4-6', stage:4, title:'Contractions', show:"can't  I'm  it's", say:"A contraction squishes two words into one. The apostrophe takes the place of missing letters. Can not becomes can't!",
    ex:[["can't",'🚫'],["I'm",'🙋'],["it's",'👉']], words:["can't","don't","it's","I'm","we'll","he's"], build:[['can',"'t"],['I',"'m"],['we',"'ll"]],
    heart:[['hungry','y','The y at the end of "hungry" says ee.']],
    text:`"I'm hungry, but I can't find a snack," said Ben.

"It's in the box!" said his sister. "We'll share it."

"Don't eat it all!" Ben laughed.`,
    qs:[['What was Ben looking for?',['🍪 A snack','🧸 A toy','👟 A shoe'],0],["What does \"we'll\" mean?",['👫 We will','🚫 We will not','❓ Where will'],0]] },
  { id:'4-7', stage:4, title:'Reading with feeling', show:'! ? " "', say:'Great readers change their voice! An exclamation mark means excited. A question mark means your voice goes up. Quotes mean someone is talking.',
    ex:[['Wow!','🤩'],['Why?','🤔'],['"Hi!"','👋']], words:['wow','why','yikes','hooray','whisper','shout'], build:['shout','why','wow'],
    heart:[['whisper','wh','The wh in "whisper" says wuh. Say it softly!']],
    text:`"Is it time for the race?" asked Rosa.

"Yes!" shouted Leo. "Ready, set, go!"

Rosa zoomed past the tree. "Hooray!" she cheered. "I did it!"

Leo was tired. "Wow," he whispered. "You are so fast."`,
    qs:[['What were Rosa and Leo doing?',['🏁 Having a race','🍰 Baking','📖 Reading'],0],['How did Leo say "Wow"?',['🤫 He whispered','📣 He shouted','🎵 He sang'],0]] },
  { id:'4-8', stage:4, title:'Chapter time!', show:'📖', say:'Time for a longer story! Read it smoothly, like you are telling it to a friend.',
    ex:[['map','🗺️'],['treasure','💰'],['shovel','⛏️']], words:['treasure','shovel','island','quickly','because','finally'], build:[['trea','sure'],['shov','el'],['fi','nal','ly']],
    heart:[['island','s','The s in "island" is quiet.']],
    text:`Nora found an old map in her grandpa's attic. A red X was drawn on a little island in the middle of the lake.

"Can we go?" she asked. Grandpa smiled and grabbed two shovels.

They rowed the boat to the island. Nora counted ten big steps from the tallest tree, and they began to dig.

Finally, the shovel hit something hard. It was a small tin box! Inside was a note: "The real treasure is the fun we had today."

Nora laughed. Grandpa had hidden it there when he was a boy, and now it was her turn to hide a new one.`,
    qs:[['Where did Nora find the map?',['🏠 In the attic','🏫 At school','🌳 In a tree'],0],['What was inside the box?',['📝 A note','💰 Gold coins','💎 A diamond'],0],['Who hid the box long ago?',['👴 Grandpa, when he was a boy','👧 Nora','🏴‍☠️ A pirate'],0]] }
];
const PHONICS_BY_ID = Object.fromEntries(PHONICS.map(l => [l.id, l]));
// Where each kid starts if the grown-up skips the Phonics Check
const PHONICS_DEFAULT_START = { son:'2-1', daughter:'3-1' };

/* ============================================================
   DAUGHTER'S TRACK — "Skyfire Academy" (Levels 1–4)
   Original characters: Wren (young dragon rider), Pebble (small gray
   earth dragon), Master Oona (teacher), Tobin & his fire dragon Blaze,
   Mira & her water dragon Ripple, and the mysterious Lord Vex.
   text -> blank line = new page;  qs -> [question, [options], correctIndex]
   ============================================================ */
const DAUGHTER_TRACK = {
  key: 'daughter',
  trackName: 'Skyfire Academy',
  hero: 'Wren',
  mascot: '🐉',
  levels: [
    {
      n: 1, title: 'New Rider', kind: 'story',
      stories: [
        { title: 'Wren Gets a Dragon', emoji: '📜',
          text: `Wren lived on a farm at the edge of the hills. One day, a big bird flew to her door. It had a note.

The note said, "Come to Skyfire Academy. A dragon is waiting for you!"

Wren ran to the gate. A small gray dragon sat in the grass. "I am Pebble," it said. Wren grinned. "Hi, Pebble!"`,
          qs: [
            ['Where did Wren live?', ['On a farm', 'In a castle', 'On a boat', 'In a cave'], 0],
            ['What brought the note?', ['A big bird', 'A dragon', 'A cat', 'A wizard'], 0],
            ['What was the name of the academy?', ['Skyfire Academy', 'Moon School', 'Dragon Hill', 'Stone Tower'], 0],
            ['What color was Pebble?', ['Gray', 'Red', 'Gold', 'Blue'], 0],
            ['How did Wren feel when she met Pebble?', ['Happy', 'Scared', 'Angry', 'Bored'], 0]
          ] },
        { title: "Pebble Can't Fly", emoji: '🪶',
          text: `Pebble had wings, but they were small. He flapped and flapped. He did not go up.

"I am too little," said Pebble. He hung his head.

Wren gave him a big hug. "We will practice every day," she said. "Then you will fly."`,
          qs: [
            ['What was wrong with Pebble\'s wings?', ['They were small', 'They were broken', 'They were wet', 'He had no wings'], 0],
            ['What did Pebble do with his wings?', ['Flapped and flapped', 'Folded them up', 'Painted them', 'Hid them'], 0],
            ['What did Wren give Pebble?', ['A big hug', 'A snack', 'A hat', 'A map'], 0],
            ['What will they do every day?', ['Practice', 'Sleep late', 'Go swimming', 'Bake bread'], 0],
            ['Why did Pebble hang his head?', ['He felt sad', 'He was hungry', 'He was sleepy', 'He saw a bug'], 0]
          ] },
        { title: 'The First Lesson', emoji: '✨',
          text: `Master Oona was the teacher at the academy. She had long white hair and a tall staff.

"Today you will learn to talk to your dragon," she said.

Wren sat with Pebble and shut her eyes. She felt a warm hum in her hand. It was Pebble! Wren smiled. They could talk without words.`,
          qs: [
            ['Who was the teacher?', ['Master Oona', 'Pebble', 'Wren\'s mom', 'Lord Vex'], 0],
            ['What did Master Oona hold?', ['A tall staff', 'A sword', 'A book', 'A cup'], 0],
            ['What was the lesson about?', ['Talking to your dragon', 'Flying fast', 'Cooking', 'Reading maps'], 0],
            ['What did Wren feel in her hand?', ['A warm hum', 'Cold ice', 'A sharp pinch', 'Sticky jam'], 0],
            ['What does "talk without words" mean here?', ['They could share thoughts', 'They shouted', 'They wrote notes', 'They stopped being friends'], 0]
          ] }
      ]
    },
    {
      n: 2, title: 'Apprentice', kind: 'story',
      stories: [
        { title: 'Meet Tobin and Mira', emoji: '🔥',
          text: `At lunch, Wren sat with two new friends. Tobin had a red fire dragon named Blaze. Blaze could puff hot smoke from his nose.

Mira had a blue water dragon named Ripple. Ripple liked to float in the pond and splash the other dragons.

"What can Pebble do?" asked Tobin. Wren did not know yet. Pebble looked down at his feet. "Maybe I can't do anything," he said in Wren's mind.`,
          qs: [
            ['What kind of dragon is Blaze?', ['A fire dragon', 'A water dragon', 'An ice dragon', 'A wind dragon'], 0],
            ['Who is Mira\'s dragon?', ['Ripple', 'Blaze', 'Pebble', 'Storm'], 0],
            ['What does Ripple like to do?', ['Float and splash in the pond', 'Puff smoke', 'Dig holes', 'Sleep in trees'], 0],
            ['What did Tobin ask?', ['What can Pebble do?', 'Where is lunch?', 'Can I ride Pebble?', 'Who is Master Oona?'], 0],
            ['How did Pebble feel when Tobin asked?', ['Unsure and a little sad', 'Proud', 'Silly', 'Angry'], 0]
          ] },
        { title: 'The Rain Day Race', emoji: '🌧️',
          text: `It was a gray, rainy day, but Master Oona said, "Today we race!" The dragons had to run along the trail to the old oak tree.

Blaze ran fast but stopped to dry his wet tail. Ripple slid along the mud like a boat. Pebble ran slow and steady. His feet did not slip at all.

When they reached the oak tree, Pebble was first! "Your feet grip the ground," said Master Oona. "That is an earth dragon's gift."`,
          qs: [
            ['What was the weather like?', ['Gray and rainy', 'Sunny and hot', 'Snowy', 'Windy and dry'], 0],
            ['Where did the race end?', ['At the old oak tree', 'At the pond', 'At the castle', 'At the farm'], 0],
            ['Why did Blaze stop?', ['To dry his wet tail', 'To eat lunch', 'He got lost', 'He fell asleep'], 0],
            ['Who won the race?', ['Pebble', 'Blaze', 'Ripple', 'Tobin'], 0],
            ['What is an earth dragon\'s gift, according to Master Oona?', ['Feet that grip the ground', 'Breathing fire', 'Swimming fast', 'Flying high'], 0]
          ] },
        { title: "Pebble's Secret", emoji: '💎',
          text: `That night, Wren could not sleep. She heard a soft tap, tap, tap. She peeked out and saw Pebble in the yard.

Pebble was tapping a rock with his claw. Each time he tapped, the rock began to glow with a green light. Soon the whole yard shone like a field of stars.

"Pebble!" Wren gasped. "You have earth magic!" Pebble's eyes grew wide. "I can make stones shine," he said. "Maybe I am special after all."`,
          qs: [
            ['Why was Wren awake?', ['She could not sleep', 'She was hungry', 'It was morning', 'Tobin called her'], 0],
            ['What sound did Wren hear?', ['Tap, tap, tap', 'Roar', 'Splash', 'Ding, dong'], 0],
            ['What color did the rocks glow?', ['Green', 'Red', 'Purple', 'Orange'], 0],
            ['What kind of magic does Pebble have?', ['Earth magic', 'Fire magic', 'Water magic', 'Ice magic'], 0],
            ['How did Pebble feel at the end?', ['Special and surprised', 'Bored', 'Scared of the dark', 'Grumpy'], 0]
          ] }
      ]
    },
    {
      n: 3, title: 'Junior Rider', kind: 'story',
      stories: [
        { title: 'The Floating Island', emoji: '🏝️',
          text: `High above the academy, there was an island that floated in the clouds. Nobody had visited it in a hundred years. "It is too dangerous," the teachers always said.

One morning, Master Oona gathered the students. "The island is sinking," she announced. "Its magic crystals are fading. We need dragons who can fly up and bring the crystals back to life."

Blaze and Ripple flew up with Tobin and Mira. Pebble watched them disappear into the clouds. His small wings drooped. Wren rubbed his scaly head. "Your magic makes stones glow," she whispered. "Crystals are stones. Maybe the island needs you most of all."`,
          qs: [
            ['Where was the island?', ['Floating in the clouds', 'Under the sea', 'Inside a mountain', 'Behind the barn'], 0],
            ['Why was the island sinking?', ['Its magic crystals were fading', 'It was too heavy', 'A storm hit it', 'Dragons were sitting on it'], 0],
            ['Who flew up first?', ['Tobin and Mira with their dragons', 'Wren and Pebble', 'Master Oona alone', 'Lord Vex'], 0],
            ['What does "drooped" mean?', ['Hung down', 'Grew bigger', 'Lit up', 'Flapped fast'], 0],
            ['Why does Wren think Pebble could help?', ['Crystals are stones, and he makes stones glow', 'He flies the fastest', 'He is the biggest dragon', 'He knows the way'], 0]
          ] },
        { title: 'A Mysterious Visitor', emoji: '🧥',
          text: `The next day, a stranger arrived at the academy gate. He wore a long purple cloak, and his boots were covered in black dust. He called himself a traveling merchant.

"I am looking for something golden," he said, smiling a thin smile. "Something shaped like an egg." Master Oona's face went pale. "We have nothing like that here," she said firmly, and she closed the gate.

Pebble sniffed the air after the stranger left. "His cloak smelled like smoke and thunder," he told Wren. "I do not trust him." Wren did not trust him either. She had noticed something strange: the merchant had no wagon and no goods to sell.`,
          qs: [
            ['What color was the stranger\'s cloak?', ['Purple', 'Green', 'Gray', 'White'], 0],
            ['What was the stranger looking for?', ['Something golden shaped like an egg', 'A lost dragon', 'A place to sleep', 'A map of the island'], 0],
            ['How did Master Oona react?', ['Her face went pale and she closed the gate', 'She laughed', 'She invited him in', 'She bought something'], 0],
            ['What did Pebble smell on the cloak?', ['Smoke and thunder', 'Flowers', 'Fresh bread', 'Salt water'], 0],
            ['Why did Wren think the merchant was not really a merchant?', ['He had no wagon and nothing to sell', 'He was too tall', 'He spoke too fast', 'He had a dragon'], 0]
          ] },
        { title: 'The Golden Star Egg', emoji: '🥚',
          text: `That evening, Master Oona led Wren, Tobin, and Mira down a winding staircase beneath the academy. At the bottom was a room lit by candles. On a velvet pillow sat a golden egg, sparkling like a thousand tiny stars.

"This is the Star Egg," Master Oona explained. "Inside is a storm dragon, the rarest dragon of all. It has been waiting to hatch for five hundred years. Whoever is with it when it hatches will share its bond."

"Is that what the stranger wanted?" asked Mira. Master Oona nodded slowly. "If someone with a cruel heart bonds with a storm dragon, they could control the wind, the rain, and the lightning." Wren shivered. Pebble pressed closer to her side.`,
          qs: [
            ['Where was the Star Egg kept?', ['In a room beneath the academy', 'On the floating island', 'In Wren\'s bedroom', 'In a tree'], 0],
            ['What kind of dragon is inside the egg?', ['A storm dragon', 'A fire dragon', 'An earth dragon', 'A water dragon'], 0],
            ['How long has the egg been waiting to hatch?', ['Five hundred years', 'Ten days', 'One year', 'Fifty years'], 0],
            ['What could a cruel person do with a storm dragon?', ['Control wind, rain, and lightning', 'Grow flowers', 'Make the moon disappear', 'Talk to fish'], 0],
            ['Why did Pebble press close to Wren?', ['To comfort her because she was scared', 'Because he was cold', 'To push her down the stairs', 'Because he was sleepy'], 0]
          ] }
      ]
    },
    {
      n: 4, title: 'Rider', kind: 'story',
      stories: [
        { title: 'The Egg Is Gone!', emoji: '😱',
          text: `Wren woke to the sound of bells ringing across the academy. She threw on her boots and ran into the hallway, with Pebble right behind her.

"The Star Egg is gone!" Tobin shouted, racing toward her. "Someone broke into the room last night!"

They hurried down the staircase. The velvet pillow was empty. The candles had been blown out, and the floor was covered in black dust.

"Black dust," Wren said slowly. "Just like the stranger's boots."

Master Oona knelt beside the pillow. "You are right," she said quietly. "That stranger was Lord Vex. He was once a student here, long ago."

"What should we do?" asked Mira, holding Ripple's tail tightly.

Master Oona stood up. "The egg will hatch at the next full moon. That is in three days. We must find it before then."`,
          qs: [
            ['What woke Wren up?', ['Bells ringing', 'A dragon roar', 'Rain on the roof', 'Tobin knocking'], 0],
            ['What did they find on the floor?', ['Black dust', 'Gold coins', 'Feathers', 'Water'], 0],
            ['Who was the stranger, really?', ['Lord Vex', 'A farmer', 'Master Oona\'s brother', 'A king'], 0],
            ['When will the egg hatch?', ['At the next full moon, in three days', 'Tomorrow morning', 'In one year', 'It already hatched'], 0],
            ['Why did Mira hold Ripple\'s tail tightly?', ['She was worried and scared', 'Ripple was running away', 'She was playing a game', 'Her hands were cold'], 0]
          ] },
        { title: 'Following the Footprints', emoji: '👣',
          text: `Outside the academy walls, Wren spotted something in the mud. "Footprints!" she called. "And they are covered in black dust."

The footprints led toward the Whispering Woods, a dark forest where the trees were so tall they blocked out the sun.

"Students are not allowed in the Whispering Woods," Tobin said nervously.

"Students are not allowed to let a storm dragon fall into the wrong hands, either," Mira replied.

Wren looked at Pebble. Pebble looked back at her. Through their bond, she felt his heart beating fast, but she also felt something else: courage.

"We will go together," Wren said. "Master Oona is guarding the academy. We will follow the trail and send a message if we find anything."

Blaze puffed a little ring of smoke, which meant yes. Ripple flicked her tail. The three riders and their dragons stepped into the shadows of the trees.`,
          qs: [
            ['What did Wren find in the mud?', ['Footprints with black dust', 'A golden feather', 'A broken egg shell', 'A map'], 0],
            ['Where did the footprints lead?', ['The Whispering Woods', 'The floating island', 'The farm', 'The pond'], 0],
            ['Why did Tobin feel nervous?', ['Students are not allowed in the woods', 'He lost Blaze', 'He was hungry', 'He saw Lord Vex'], 0],
            ['What did Blaze\'s smoke ring mean?', ['Yes', 'No', 'Run away', 'I am hungry'], 0],
            ['What two feelings did Wren sense from Pebble?', ['Fear and courage', 'Anger and boredom', 'Hunger and sleepiness', 'Silliness and joy'], 0]
          ] },
        { title: "Pebble's Big Jump", emoji: '🪽',
          text: `Deep in the woods, the path ended at a wide river. The water rushed and foamed over sharp rocks. On the other side, the black footprints continued.

Ripple dove right in and swam across with Mira on her back. Blaze carried Tobin, flapping hard over the water.

Wren and Pebble stood alone on the bank. "I can't fly that far," Pebble said. "My wings are too small."

Wren knelt beside him. "Remember the race? You were slow and steady. You didn't give up."

Pebble took a deep breath. He backed up, ran as fast as he could, and leaped. His little wings beat once, twice, three times. For one amazing moment, Pebble was flying!

He landed on the other side with a thump, skidding in the mud. Wren tumbled off, laughing. "You did it, Pebble! You flew!"

Pebble puffed out his chest. "Only a little," he said. But his eyes were shining.`,
          qs: [
            ['What blocked the path?', ['A wide river', 'A tall wall', 'A sleeping giant', 'A deep hole'], 0],
            ['How did Ripple cross?', ['She swam', 'She flew', 'She jumped on rocks', 'She walked on a bridge'], 0],
            ['What did Wren remind Pebble about?', ['The race, where he did not give up', 'His mom', 'The Star Egg', 'His dinner'], 0],
            ['How many times did Pebble beat his wings?', ['Three times', 'Once', 'Ten times', 'He didn\'t'], 0],
            ['Why were Pebble\'s eyes shining at the end?', ['He was proud of himself', 'He was crying from pain', 'It was very bright', 'He was angry'], 0]
          ] }
      ]
    }
  ]
};

/* DAUGHTER'S TRACK — Levels 5–8 (the Star Egg quest continues) */
DAUGHTER_TRACK.levels.push(
  {
    n: 5, title: 'Senior Rider', kind: 'story',
    stories: [
      { title: 'Into the Whispering Woods', emoji: '🌲',
        text: `The deeper they walked, the quieter the forest became. The birds stopped singing. Even the wind seemed to hold its breath. Every few steps, the leaves above them rustled and whispered, as if the trees were sharing secrets.

"Do you hear that?" Mira asked. "It sounds like they're saying our names."

Tobin laughed, but it came out shaky. "Trees can't talk." Blaze lit a small flame on the tip of his tail so they could see the path.

Pebble tapped a stone with his claw, and it glowed green. He tapped another, and another, leaving a trail of shining stones behind them. "So we can find our way home," he explained.

"Smart thinking," Wren said proudly.

They walked until the black footprints stopped at the edge of a clearing. In the middle stood a ring of crooked trees, their branches twisted together like knotted fingers.

Suddenly, Ripple froze. Her blue scales stood up on her back. Then Wren saw them: two glowing yellow eyes, watching from the darkness between the trees.

The eyes blinked once. Then they began to move closer.`,
        qs: [
          ['What happened to the forest as they walked deeper?', ['It got quieter', 'It got louder', 'It got sunnier', 'It started snowing'], 0],
          ['Why did Pebble make a trail of glowing stones?', ['So they could find their way home', 'To scare animals', 'To make it pretty', 'To warn Lord Vex'], 0],
          ['How did Blaze help the group see?', ['He lit a flame on his tail', 'He carried a lantern', 'He made the moon shine', 'He flew above the trees'], 0],
          ['What does "the wind seemed to hold its breath" mean?', ['Everything became very still', 'The wind got stronger', 'The wind was sick', 'It started to rain'], 0],
          ['What did they see at the end of the chapter?', ['Two glowing yellow eyes', 'The Star Egg', 'Master Oona', 'A castle'], 0]
        ] },
      { title: 'The Eyes in the Dark', emoji: '👀',
        text: `Blaze growled, and Tobin raised his arms to protect his friends. But the creature that stepped out of the shadows was not a monster. It was a small silver fox with a fluffy tail that sparkled like frost.

"Please don't hurt me," the fox squeaked. "My name is Nim. I am a moon sprite."

Wren slowly knelt down. "We won't hurt you, Nim. We're looking for a man in a purple cloak. He stole a golden egg."

Nim's ears flattened. "Lord Vex," she whispered. "He came through here two nights ago. He trapped my family in a jar of shadows so we could not warn anyone."

Mira gasped. "That's terrible!"

"He's taking the egg to his tower," Nim continued. "It's on the other side of the Fog Bridge. If you help me free my family, I will show you the secret path."

Wren looked at her friends. They all nodded.

"Deal," Wren said, holding out her hand. Nim placed her tiny paw in Wren's palm.

At that moment, a low rumble shook the ground. Far away, beyond the trees, a single bolt of purple lightning split the sky.`,
        qs: [
          ['What was the creature with yellow eyes?', ['A silver fox moon sprite named Nim', 'A wolf', 'Lord Vex', 'A baby dragon'], 0],
          ['What did Lord Vex do to Nim\'s family?', ['Trapped them in a jar of shadows', 'Took them to the academy', 'Turned them into stones', 'Sent them to the island'], 0],
          ['Where is Lord Vex taking the egg?', ['To his tower', 'To the floating island', 'To the farm', 'To the river'], 0],
          ['What deal did Wren make with Nim?', ['Help free her family in exchange for the secret path', 'Give her the egg', 'Take her to the academy', 'Buy her food'], 0],
          ['What do you think the purple lightning means?', ['Lord Vex is using dark storm magic', 'A happy party', 'It is morning', 'Master Oona is coming'], 0]
        ] },
      { title: 'The Bridge of Fog', emoji: '🌫️',
        text: `Nim led them along a narrow path that twisted between giant mushrooms. At last, they reached the edge of a deep canyon. Stretching across it was a bridge made entirely of thick white fog.

"Is that safe?" Tobin asked, poking it with a stick. The stick passed right through.

"The bridge only holds those who are brave," Nim explained. "If you feel afraid, the fog gets thinner."

Mira went first. She took a deep breath, and Ripple walked beside her. The fog held them up like a soft, cool cloud. Tobin and Blaze went next, and they made it across too.

Then it was Wren's turn. She stepped onto the fog with Pebble at her side. Halfway across, she made the mistake of looking down. The canyon was so deep she couldn't see the bottom.

Her heart pounded. Her knees trembled. Beneath her boots, the fog began to thin.

"Wren!" Mira shouted from the other side. "Don't look down!"

But it was too late. With a soft hiss, the fog beneath them started to vanish, and Wren felt herself beginning to fall.`,
        qs: [
          ['What was the bridge made of?', ['Fog', 'Stone', 'Wood', 'Ice'], 0],
          ['What makes the fog bridge get thinner?', ['Feeling afraid', 'Walking fast', 'Talking loudly', 'Carrying heavy things'], 0],
          ['Who crossed the bridge first?', ['Mira and Ripple', 'Wren and Pebble', 'Tobin and Blaze', 'Nim'], 0],
          ['What mistake did Wren make?', ['She looked down', 'She ran too fast', 'She forgot Pebble', 'She dropped her boots'], 0],
          ['Why is this ending called a "cliffhanger"?', ['It stops at an exciting moment so you want to read more', 'Someone is hanging from a cliff only', 'The story is over forever', 'It is a happy ending'], 0]
        ] }
    ]
  },
  {
    n: 6, title: 'Dragon Knight', kind: 'story',
    stories: [
      { title: 'Pebble Holds the Bridge', emoji: '🪨',
        text: `Wren squeezed her eyes shut, waiting for the fall. Instead, she felt something solid beneath her feet.

She opened her eyes. Pebble had slammed his claws down onto the disappearing fog, and his earth magic was spreading outward in a brilliant green glow. Where the fog had been, smooth gray stones were appearing, one after another, locking together like puzzle pieces.

"I've got you!" Pebble grunted, his whole body trembling with effort. "Walk, Wren! Walk forward!"

Wren took one shaky step, then another. The stones held firm. Pebble crept along beside her, building the stone bridge just ahead of each footstep. Sweat glistened on his scales, but he refused to stop.

When they finally reached the other side, Pebble collapsed in a heap, completely exhausted. Mira and Tobin rushed over, cheering.

"Pebble, that was incredible!" Tobin exclaimed. "I didn't know earth dragons could build things out of nothing!"

"Neither did I," Pebble admitted, panting. He looked up at Wren. "When you were afraid, I couldn't feel anything except that I needed to save you. The magic just happened."

Wren wrapped her arms around his neck. "Master Oona says a dragon's power grows with the strength of its bond," she said softly. "I think our bond just got a lot stronger."

Nim's tail swished excitedly. "Come on," she urged. "Lord Vex's tower is just over that hill. The full moon rises tomorrow night."

Behind them, the stone bridge glowed faintly in the darkness, a sturdy path that would still be there for anyone who needed to cross.`,
        qs: [
          ['What did Pebble create to save Wren?', ['A bridge of stones', 'A rope', 'A fire', 'A cloud'], 0],
          ['How did the stones fit together?', ['Like puzzle pieces', 'Like a pile of sand', 'Like falling leaves', 'Like water drops'], 0],
          ['What does "exhausted" mean?', ['Extremely tired', 'Very happy', 'Hungry', 'Confused'], 0],
          ['According to Master Oona, what makes a dragon\'s power grow?', ['The strength of its bond', 'Eating lots of food', 'Getting older', 'Flying higher'], 0],
          ['Why might it matter that the bridge was still there at the end?', ['Others can cross safely, and it shows Pebble\'s magic lasts', 'It will fall down soon', 'Lord Vex built it', 'It is a trap'], 0]
        ] },
      { title: 'The Tower of Vex', emoji: '🏰',
        text: `Lord Vex's tower rose from the top of a rocky hill like a crooked black finger pointing at the sky. Storm clouds swirled around its peak, and purple lightning flickered inside them.

The friends crouched behind a boulder. "There's only one door," Tobin whispered, "and it's guarded by those things." Two enormous stone gargoyles sat on either side of the entrance, their eyes glowing red.

"There's another way in," Nim said. "My family is trapped near the top, in a room with a round window. I can climb the vines, but I'm not strong enough to open the jar."

Mira studied the tower carefully. "Ripple can make it rain on the gargoyles. Water might distract them."

"And Blaze can make smoke to hide us," Tobin added.

The plan worked perfectly. Ripple sprayed a sudden shower over the gargoyles, who turned their heads, grumbling. Blaze puffed out a thick gray cloud. Hidden by the smoke, Wren and Pebble scrambled up the vines behind Nim.

Through the round window, Wren saw a cluttered room filled with dusty books and strange glass bottles. On a table sat a dark jar, swirling with shadows, and next to it was the Star Egg, glowing brighter than ever.

But something else made Wren's breath catch. Pinned to the wall was an old drawing of a young boy riding a dragon. Beneath it, someone had written in shaky letters: "Vex and Thunder, Skyfire Academy."

"Lord Vex was a dragon rider," Wren whispered. "So what happened to his dragon?"`,
        qs: [
          ['What did the tower look like?', ['A crooked black finger pointing at the sky', 'A round golden dome', 'A tiny cottage', 'A tall glass castle'], 0],
          ['Who guarded the door?', ['Two stone gargoyles', 'Lord Vex\'s soldiers', 'A sleeping bear', 'Nobody'], 0],
          ['How did the team distract the guards?', ['Ripple made rain and Blaze made smoke', 'They threw rocks', 'They sang a song', 'They knocked on the door'], 0],
          ['What does "cluttered" mean?', ['Messy and full of stuff', 'Clean and empty', 'Very cold', 'Brightly lit'], 0],
          ['What did the old drawing reveal?', ['Lord Vex was once a dragon rider at Skyfire Academy', 'Where the treasure was', 'That Nim was a dragon', 'How to open the jar'], 0]
        ] },
      { title: 'The Trap', emoji: '🌹',
        text: `Wren carefully pushed open the round window and slipped inside. Pebble squeezed in after her, and Nim leaped onto the table beside the jar of shadows. Inside, Wren could see tiny silver shapes pressed against the glass: Nim's family.

"Pebble, can you crack it?" Wren whispered.

Pebble tapped the jar with his claw. A thin green line appeared across the glass. He tapped again, and the crack spread. With a soft pop, the lid flew off, and the shadows poured out like smoke. Five little silver foxes tumbled onto the table, squealing with joy as they hugged Nim.

Wren turned toward the Star Egg. She reached out to take it, but the moment her fingers touched its golden shell, the floor beneath her began to shake.

Thick, thorny vines burst up through the floorboards. They twisted and curled around Wren and Pebble, weaving themselves into a cage. Within seconds, they were trapped.

"I wondered when you would arrive," said a cold voice. Lord Vex stepped out from behind a bookshelf, his purple cloak sweeping across the floor. "Master Oona always did send children to do her work."

"Give back the egg!" Wren demanded, gripping the thorny bars.

Lord Vex smiled. "When the moon rises tomorrow, this egg will hatch, and the storm dragon will bond with me. Then no dragon will ever leave me again."

Wren noticed something flicker across his face, just for a moment. It wasn't anger. It looked like sadness.

Nim and her family had vanished out the window. Wren hoped they had gone for help, because the thorns were getting tighter.`,
        qs: [
          ['How many silver foxes were freed from the jar?', ['Five', 'Two', 'Ten', 'One'], 0],
          ['What happened when Wren touched the Star Egg?', ['Thorny vines trapped her in a cage', 'It hatched', 'It disappeared', 'It turned to stone'], 0],
          ['What does Lord Vex want the storm dragon to do?', ['Bond with him', 'Fly away', 'Destroy the academy', 'Protect Wren'], 0],
          ['What did Lord Vex mean by "no dragon will ever leave me again"?', ['A dragon left him before and he was hurt by it', 'He has too many dragons', 'He hates dragons', 'His dragon is sleeping'], 0],
          ['What do you think Nim and her family went to do?', ['Get help for Wren', 'Go to sleep', 'Find food', 'Join Lord Vex'], 0]
        ] }
    ]
  },
  {
    n: 7, title: 'Dragon Captain', kind: 'story',
    stories: [
      { title: 'Escape from the Thorn Cage', emoji: '🗝️',
        text: `Lord Vex swept out of the room, taking the Star Egg with him. The door slammed, and the lock clicked. Wren and Pebble were alone in the thorny cage as the last gray light faded from the round window.

"The thorns tighten whenever we move," Pebble said, wincing. A sharp point had snagged one of his scales.

Wren forced herself to stay still and think. She remembered something Master Oona had taught them during their very first week: "Every kind of magic has an opposite. Fire fears water. Shadow fears light. Thorns fear..."

"Stone," Wren breathed. "Thorns grow in soil, but they can't grow through solid rock!"

Pebble's eyes lit up. He pressed his claws against the floor beneath the cage. Slowly, carefully, a layer of smooth gray stone spread outward from his feet. Wherever it touched the base of the vines, the thorns shriveled and turned brown. The cage began to sag.

"Keep going!" Wren urged.

Pebble pushed harder. The stone crept up the bars of the cage, and one by one, the thorny vines cracked and crumbled into dust. With a final snap, the cage collapsed around them.

They were free, but the door was still locked. Wren rattled the handle, but it wouldn't budge.

Then they heard scratching at the window. Nim's small silver face appeared, grinning. Behind her, clinging to the vines, were Tobin and Mira.

"Nim told us everything," Mira said, climbing inside. "Are you hurt?"

"We're okay," Wren said, brushing thorn dust off her sleeves. "But Lord Vex took the egg to the top of the tower. The moon rises in a few hours."

Tobin peered out the window and pointed upward. The storm clouds around the tower's peak had grown enormous, crackling with purple light. Thunder rumbled so deeply that the walls trembled.

"Then we'd better hurry," he said, "because it looks like the storm is already starting."`,
        qs: [
          ['What happened when Wren and Pebble moved in the cage?', ['The thorns got tighter', 'The cage opened', 'The thorns grew flowers', 'Nothing happened'], 0],
          ['What lesson from Master Oona helped Wren?', ['Every kind of magic has an opposite', 'Always run from danger', 'Dragons never get tired', 'Thorns are friendly'], 0],
          ['What did Pebble use to defeat the thorns?', ['Stone magic', 'Fire', 'Water', 'A sword'], 0],
          ['What does "shriveled" mean?', ['Dried up and shrank', 'Grew taller', 'Turned bright green', 'Exploded'], 0],
          ['What does the growing storm tell us?', ['The egg may hatch soon and Vex\'s plan is starting', 'It\'s a sunny day', 'Master Oona has arrived', 'The adventure is over'], 0]
        ] },
      { title: 'Storm over the Tower', emoji: '⛈️',
        text: `Mira knelt by the locked door and placed her hand on Ripple's head. "Ripple, can you fill the keyhole?" Ripple sent a thin stream of water into the lock. Then Blaze breathed a short, hot puff of fire. The water inside the lock turned to steam with a loud hiss, and the old metal popped open.

"Teamwork," Tobin said with a grin.

They raced up a spiral staircase that seemed to go on forever. The higher they climbed, the louder the thunder became. Rain lashed against the narrow windows, and the wind howled through cracks in the walls like an angry animal.

At the top, a wooden door hung open, banging back and forth in the wind. Beyond it was the roof of the tower, a flat circle of stone surrounded by a low wall. In the center stood Lord Vex, his cloak whipping wildly around him. He held the Star Egg high above his head.

The full moon had just appeared between the storm clouds, and its silver light poured down onto the egg. The golden shell was glowing so brightly that Wren had to shield her eyes. A long crack zigzagged across its surface.

"It's hatching!" Mira cried.

Lord Vex turned and saw them. "You're too late!" he shouted over the roaring wind. "In a moment, the storm dragon will open its eyes, and the first face it sees will be mine!"

Another crack split the shell. A bolt of lightning struck the tower wall, sending chunks of stone flying. Blaze spread his wings to shield Tobin. Ripple wrapped herself around Mira.

Wren grabbed Pebble's side. Through their bond, she could feel that he was terrified, but he was not backing away.

"Pebble," she whispered, "the storm dragon is just a baby. It will be scared and confused. It doesn't need someone to control it. It needs someone to calm it down."

Pebble looked at her. "Then go," he said. "I'll keep the tower standing."

The egg burst open in a flash of blinding white light.`,
        qs: [
          ['How did they open the locked door?', ['Ripple filled the lock with water and Blaze turned it to steam', 'Tobin kicked it', 'Nim had a key', 'Pebble broke it with stone'], 0],
          ['Where was Lord Vex at the top of the tower?', ['On the roof holding the egg', 'Hiding in a closet', 'Asleep in bed', 'Running away down the stairs'], 0],
          ['What made the egg start hatching?', ['The light of the full moon', 'Lord Vex\'s magic words', 'The rain', 'Pebble\'s glowing stones'], 0],
          ['What did Lord Vex want to happen?', ['The storm dragon to see his face first', 'The storm dragon to fly away', 'The egg to break into pieces', 'The students to take the egg'], 0],
          ['What does Wren believe the baby storm dragon needs?', ['Someone to calm it down', 'Someone to control it', 'To be locked in a cage', 'Lots of food'], 0]
        ] },
      { title: 'The Storm Dragon Hatches', emoji: '🐲',
        text: `When the light faded, a baby dragon sat among the broken pieces of golden shell. It was no bigger than a large dog, with silver-blue scales that crackled with tiny sparks. Its wings were folded tight against its body, and its huge eyes darted wildly around the stormy rooftop.

The baby dragon let out a frightened shriek. Instantly, the wind doubled in strength. Lightning struck the tower again and again.

"Look at me!" Lord Vex commanded, stepping toward it. "I am your master!"

The baby dragon flinched away from his voice. Its sparks grew brighter and more dangerous. The storm swirled faster.

Behind Wren, the tower walls began to crack. Pebble planted his feet and pressed his claws against the stones. Green light rushed through the cracks, sealing them shut as quickly as they appeared. His legs shook, but he held on.

Wren took a slow step toward the baby dragon. Then another. She didn't shout. She didn't command. She knelt down on the wet stone, so she wasn't any taller than the baby.

"Hey there," she said gently. "I know it's loud and scary. You've been asleep for a really long time. It's okay to be afraid."

The baby dragon's eyes found hers. Its sparks flickered.

Wren closed her eyes, the way Master Oona had taught her on the very first day. She didn't try to bond with the dragon. She simply let it feel what she was feeling: calm, and safe, and kind.

Slowly, the wind softened. The rain turned to a gentle drizzle. The lightning stopped.

When Wren opened her eyes, the baby dragon had crept forward and rested its head on her knee. Its sparks had faded to a soft blue glow.

"Impossible," Lord Vex whispered. His arms fell to his sides. "It chose you."

"No," Wren said quietly. "It didn't choose anyone yet. It just needed to feel safe first."

Above them, the storm clouds parted, and the full moon shone down on the rooftop like a silver spotlight.`,
        qs: [
          ['What color were the baby dragon\'s scales?', ['Silver-blue', 'Bright red', 'Green', 'Black'], 0],
          ['What happened to the storm when the baby shrieked?', ['The wind doubled and lightning struck', 'The storm stopped', 'It started snowing', 'The moon disappeared'], 0],
          ['What was Pebble doing during this chapter?', ['Holding the tower together with stone magic', 'Fighting Lord Vex', 'Sleeping', 'Flying away'], 0],
          ['Why did Wren kneel down?', ['So she would not seem big and scary to the baby', 'Because she was tired', 'To pick up the shell', 'Because she slipped'], 0],
          ['What is the big difference between how Vex and Wren treated the dragon?', ['Vex tried to command it; Wren tried to comfort it', 'Vex was kind; Wren was mean', 'They did the same thing', 'Wren ignored the dragon'], 0]
        ] }
    ]
  },
  {
    n: 8, title: 'Dragon Guardian', kind: 'story',
    stories: [
      { title: "Lord Vex's Choice", emoji: '💜',
        text: `For a long moment, no one moved. Rainwater dripped from the edges of the tower. The baby storm dragon yawned, revealing tiny pointed teeth, and snuggled closer to Wren's knee.

Lord Vex sank down onto the low stone wall. Without the storm swirling around him, he didn't look powerful anymore. He looked tired, and older than Wren had expected.

"I saw the drawing on your wall," Wren said carefully. "Vex and Thunder, Skyfire Academy. Was Thunder your dragon?"

Lord Vex was silent for so long that Wren thought he wouldn't answer. Then he spoke in a low voice. "Thunder was a wind dragon. We were bonded when I was about your age. I was the best student in my class. I could make Thunder fly faster and higher than any other dragon."

"What happened?" Mira asked softly.

"I pushed him too hard," Vex admitted. "I never asked whether he was tired, or scared, or hurt. I only cared about winning. One day, during a race through the mountains, he simply... flew away. He never came back." Vex stared down at his hands. "I told myself that dragons couldn't be trusted. That if I found a dragon powerful enough, I could make it obey, and it would never leave."

Wren felt Pebble's thoughts brush against hers, warm and sad. He's lonely, Pebble said through their bond. He's been lonely for a very long time.

Wren stood up, and the baby dragon stayed close to her feet. "Master Oona taught us that a bond isn't something you take," she said. "It's something you build, one day at a time. Pebble couldn't fly when I met him. He thought he wasn't special. But I didn't love him because he was powerful. I loved him because he was Pebble."

Pebble pressed his head against her side, and Wren felt the familiar warm hum in her hand.

Lord Vex looked up at them. His eyes were wet. "I don't know how to do that," he said. "I've forgotten how."

"Then come back to the academy," Wren said. "You can learn again. That's what schools are for."

Tobin's mouth fell open. Mira nudged him with her elbow.

The baby storm dragon padded across the wet stones toward Lord Vex. It sniffed his boot curiously. Vex didn't reach for it. He didn't command it. He simply held very still, the way Wren had.

The baby dragon looked at him for a long moment. Then it turned around and trotted back to Wren.

Vex let out a breath that was almost a laugh. "Fair enough," he said. "I suppose I'll have to earn it."

Far below, the forest was beginning to glow with tiny green lights. Wren smiled. Pebble's trail of shining stones was still there, waiting to lead them all home.`,
        qs: [
          ['Who was Thunder?', ['Lord Vex\'s wind dragon from long ago', 'Master Oona\'s dragon', 'The baby storm dragon', 'Tobin\'s brother'], 0],
          ['Why did Thunder fly away?', ['Vex pushed him too hard and only cared about winning', 'Thunder got lost in fog', 'Master Oona sent him away', 'Thunder wanted to find the Star Egg'], 0],
          ['What does Wren say a bond is?', ['Something you build one day at a time', 'Something you take by force', 'A kind of rope', 'A magic spell'], 0],
          ['What did Wren invite Lord Vex to do?', ['Come back to the academy to learn again', 'Leave the kingdom forever', 'Keep the storm dragon', 'Fight Master Oona'], 0],
          ['What does "I suppose I\'ll have to earn it" show about Vex?', ['He is starting to understand trust must be earned', 'He is planning another trick', 'He is angry at the dragon', 'He wants to give up'], 0]
        ] },
      { title: 'The Long Flight Home', emoji: '🌄',
        text: `By sunrise, the group was standing at the edge of the canyon, looking at the stone bridge Pebble had built. In the golden morning light, the gray stones sparkled with tiny flecks of green.

"You built this?" Lord Vex asked Pebble, sounding genuinely amazed. Pebble ducked his head shyly. "I had to," he said. "Wren was falling."

They crossed the bridge together. Nim and her family scampered ahead, their silver tails flashing in the sunlight. At the far side, Nim stopped and turned back to Wren.

"This is where my family's home is," she said. "Thank you for keeping your promise." She pressed something small and cold into Wren's palm. It was a smooth silver stone, shaped like a crescent moon. "If you ever need the moon sprites, hold this stone up to the night sky, and we will come."

Wren hugged Nim gently, and then the foxes vanished into the trees like drops of moonlight.

The rest of the journey was long. The baby storm dragon got tired quickly and kept stopping to nap in patches of sunshine. Every time it fell asleep, the clouds above them grew a little darker, and a light rain sprinkled down. Every time it woke up happy, the sky turned bright blue again.

"Its moods control the weather," Mira observed, fascinated. "When it's sad, it rains. When it's scared, there's lightning."

"Then we'd better keep it happy," Tobin said, and Blaze blew a stream of smoke rings that made the baby dragon chirp with delight.

When they reached the river, Wren looked at the rushing water and then at Pebble. "Want to try?" she asked.

Pebble's eyes sparkled. He backed up, ran as fast as he could, and leaped. His wings beat once, twice, three times, four, five, six. This time, he didn't just glide across the water. He rose higher, circled once above the treetops with Wren laughing on his back, and landed gracefully on the far bank.

Everyone cheered. Even Lord Vex clapped.

"His wings got stronger," Mira said in wonder.

"Or maybe he just stopped believing they were too small," Wren replied.

At last, the towers of Skyfire Academy appeared over the hills. Standing at the gate, her white hair blowing in the breeze, was Master Oona. Her face was stern, but as the students drew closer, Wren could see that she was trying very hard not to smile.

Then Master Oona saw who was walking behind them, and her expression changed completely.

"Vex?" she whispered.`,
        qs: [
          ['What did Nim give Wren?', ['A silver crescent moon stone', 'A golden feather', 'A map', 'A baby fox'], 0],
          ['What controls the weather around the baby storm dragon?', ['Its moods', 'The time of day', 'Lord Vex', 'The river'], 0],
          ['How did Tobin and Blaze keep the baby dragon happy?', ['Blaze blew smoke rings', 'They sang songs', 'They gave it treats', 'They let it sleep'], 0],
          ['What was different about Pebble\'s second jump over the river?', ['He truly flew and circled above the trees', 'He fell into the water', 'He refused to jump', 'Blaze carried him'], 0],
          ['What does Wren mean when she says Pebble "stopped believing they were too small"?', ['Believing in yourself can help you do hard things', 'His wings shrank', 'He forgot how to fly', 'Wren used magic on him'], 0]
        ] },
      { title: 'The Ceremony of Stars', emoji: '🌟',
        text: `Three nights later, the entire academy gathered in the Great Hall for the Ceremony of Stars. Hundreds of candles floated near the ceiling, and the walls glittered with crystals that the students had brought back from the floating island. Thanks to Pebble's earth magic, the island had stopped sinking, and it now drifted peacefully above the academy once more.

Wren sat in the front row between Tobin and Mira, nervously twisting the silver moon stone in her fingers. Pebble sat beside her, his scales polished until they gleamed.

Master Oona stepped onto the stage. "Tonight," she announced, "we honor three young riders who showed extraordinary courage. Tobin and Blaze, for their quick thinking and teamwork. Mira and Ripple, for their wisdom and calm under pressure."

Tobin and Mira walked up to receive glowing golden pins shaped like dragon wings. The audience applauded loudly.

"And finally," Master Oona continued, her voice growing warm, "Wren and Pebble. When Wren arrived at this academy, Pebble could not fly, and neither of them knew what he could do. Together, they built a bridge out of fog, broke through a cage of thorns, held a tower together in a storm, and calmed the rarest dragon in the world. But the bravest thing Wren did was something else entirely." Master Oona paused. "She offered kindness to someone who had not been kind to her."

Wren's cheeks turned pink. She glanced toward the back of the hall, where Lord Vex sat quietly in a plain gray robe instead of his purple cloak. He gave her a small nod.

"Wren and Pebble," Master Oona declared, "I name you Dragon Guardians of Skyfire Academy, the youngest in five hundred years."

The hall exploded with cheers. Pebble let out a happy roar so loud that it made the candles flicker. Wren walked onto the stage, and Master Oona fastened a silver pin, shaped like a star, onto her collar.

Then a small silver-blue shape fluttered down from the rafters. The baby storm dragon had been watching from above, and now it landed softly on Wren's shoulder, making a tiny rumbling purr.

"It still hasn't bonded with anyone," Master Oona said quietly. "It will choose when it is ready. Until then, it will stay here, where it is safe, and where it can learn what kindness feels like."

"Can it have a name?" Wren asked.

Master Oona smiled. "What would you call it?"

Wren thought for a moment. Outside the tall windows, a warm breeze stirred the leaves, and the sky was full of stars.

"Breeze," she said. "Because it doesn't have to be a storm."

Breeze chirped happily, and outside, every star seemed to shine a little brighter.

Pebble leaned against Wren's side. Through their bond, she felt the warm, familiar hum. Whatever adventure comes next, he told her, we'll face it together.

And Wren knew that they would.`,
        qs: [
          ['What happened to the floating island?', ['Pebble\'s magic stopped it from sinking', 'It crashed into the sea', 'Lord Vex took it', 'It disappeared'], 0],
          ['What did Master Oona say was Wren\'s bravest act?', ['Offering kindness to someone who had not been kind to her', 'Climbing the tower', 'Crossing the fog bridge', 'Winning the race'], 0],
          ['What title did Wren and Pebble receive?', ['Dragon Guardians of Skyfire Academy', 'Kings of the Forest', 'Storm Riders', 'Junior Students'], 0],
          ['What did Wren name the baby storm dragon?', ['Breeze', 'Thunder', 'Spark', 'Storm'], 0],
          ['Why did Wren choose that name?', ['Because it doesn\'t have to be a storm; it can be gentle', 'Because it was cold', 'Because it was Lord Vex\'s idea', 'Because it flew fast'], 0]
        ] }
    ]
  }
);

DAUGHTER_TRACK.rewards = [
  ['🔥','Cinder','fire'],['💧','Mistral','water'],['🪨','Granite','earth'],['🌪️','Gale','wind'],
  ['❄️','Frostwing','ice'],['⚡','Volt','storm'],['🌙','Lunara','moon'],['☀️','Solace','sun'],
  ['🌿','Thistle','forest'],['💎','Gemscale','crystal'],['🌋','Magmor','lava'],['🌊','Tidecrest','sea'],
  ['🌸','Blossom','flower'],['⭐','Stardust','star'],['🍂','Ember-Leaf','autumn'],['🌈','Prism','rainbow'],
  ['☁️','Nimbus','cloud'],['🪐','Cosmo','space'],['🌑','Shade','shadow'],['🎵','Lyric','song']
];

/* DAUGHTER'S TRACK — "Academy Tales": 2 extra stories per rank.
   These are side adventures. They come after the 3 main quest stories at each rank,
   so they're read when she stays at a rank for a while. Ranks 1–7 tales are set
   before the Star Egg quest; Rank 8 tales happen after it. */
const DAUGHTER_EXTRA = {
  1: [
    { title: 'Pebble Gets a Bath', emoji: '🛁',
      text: `Pebble was very muddy. Wren got a big tub and filled it up with water.

Pebble did not like the bath! He jumped out and shook and shook. Now Wren was wet and muddy too.

They both laughed. Then they jumped in the tub together.`,
      qs: [
        ['Why did Pebble need a bath?', ['He was muddy', 'He was hot', 'He was sleepy', 'He was hungry'], 0],
        ['What did Wren fill with water?', ['A big tub', 'A cup', 'A boot', 'A hat'], 0],
        ['Did Pebble like the bath at first?', ['No', 'Yes', 'He was asleep', 'He was not there'], 0],
        ['What happened when Pebble shook?', ['Wren got wet and muddy', 'The tub broke', 'He flew away', 'It began to snow'], 0],
        ['How did the story end?', ['They got in the tub together', 'Pebble ran off', 'Wren went to bed', 'Wren got mad'], 0]
      ] },
    { title: 'Snack Time', emoji: '🍎',
      text: `Dragons get hungry. Pebble likes to eat rocks! He likes red rocks best.

Wren likes apples. One day, Wren gave Pebble an apple. He did not like it. "Yuck!" he said.

Then Wren gave him a red rock. "Yum!" he said, and he ate it all up.`,
      qs: [
        ['What does Pebble like to eat?', ['Rocks', 'Apples', 'Fish', 'Bread'], 0],
        ['What color rock does Pebble like best?', ['Red', 'Blue', 'Gray', 'White'], 0],
        ['What does Wren like to eat?', ['Apples', 'Rocks', 'Bugs', 'Grass'], 0],
        ['What did Pebble say about the apple?', ['"Yuck!"', '"Yum!"', '"More, please!"', '"Thank you!"'], 0],
        ['What does this story teach us?', ['Friends can like different things', 'Rocks are good for people', 'Dragons hate food', 'Apples are bad'], 0]
      ] }
  ],
  2: [
    { title: 'The Lost Feather', emoji: '🪶',
      text: `Ripple loved shiny things. One morning, Master Oona's blue feather pen was missing. "Has anyone seen my feather?" she asked.

Wren and Pebble searched the hall. They peeked under every seat and behind every door. They did not find it.

At last, they checked the pond. There was Ripple, floating on her back, with the blue feather tucked under her chin! Ripple looked a little guilty. She gave the feather back and splashed away.`,
      qs: [
        ['What was missing?', ['Master Oona\'s blue feather pen', 'A golden egg', 'Wren\'s boots', 'A book'], 0],
        ['Where did Wren and Pebble look first?', ['In the hall', 'In the woods', 'On the roof', 'At the farm'], 0],
        ['Where did they finally find it?', ['At the pond', 'In the kitchen', 'In a tree', 'Under Wren\'s bed'], 0],
        ['Who had the feather?', ['Ripple', 'Blaze', 'Tobin', 'Pebble'], 0],
        ['Why do you think Ripple took the feather?', ['She loves shiny things', 'She needed to write a letter', 'She was cold', 'Master Oona gave it to her'], 0]
      ] },
    { title: 'Blaze Has a Cold', emoji: '🤧',
      text: `One gray morning, Blaze began to sneeze. Achoo! Each sneeze shot out a tiny puff of fire. "Oh no, he has a cold," said Tobin.

Wren made him warm tea with honey. Mira wrapped a big scarf around his neck. Pebble curled up beside him to keep him company.

By the next day, Blaze felt much better. His first sneeze-free roar was so loud it shook the leaves on the trees.`,
      qs: [
        ['What came out when Blaze sneezed?', ['A tiny puff of fire', 'Bubbles', 'Snow', 'Leaves'], 0],
        ['What did Wren make for Blaze?', ['Warm tea with honey', 'A cake', 'A bed', 'A hat'], 0],
        ['What did Mira give Blaze?', ['A big scarf', 'A blanket', 'A rock', 'A book'], 0],
        ['How did Pebble help?', ['He kept Blaze company', 'He made soup', 'He called a doctor', 'He sang loudly'], 0],
        ['What does "sneeze-free" mean?', ['Without sneezing', 'Sneezing a lot', 'A free sneeze', 'A cold sneeze'], 0]
      ] }
  ],
  3: [
    { title: 'The Library of Whispers', emoji: '📚',
      text: `The academy library was the quietest place in the whole castle. The books there were magic. If you listened closely, you could hear them whispering their stories to each other.

Wren needed a book about earth dragons. The librarian was an owl named Quill, who wore tiny round glasses. "Be very quiet," Quill hooted, "or the books will fly away."

Wren tiptoed between the tall shelves. Pebble tiptoed too, but his tail was not as careful. Thump! It bumped a shelf, and suddenly a hundred books flapped their pages and fluttered into the air like birds.

When the books finally settled, one landed right at Wren's feet. It was open to a page titled "Earth Dragons Can Build." Wren grinned at Pebble. "I think your tail found exactly what we needed."`,
      qs: [
        ['What was special about the library books?', ['They whispered and could fly', 'They were made of gold', 'They were all blank', 'They were tiny'], 0],
        ['Who was the librarian?', ['An owl named Quill', 'Master Oona', 'Lord Vex', 'A cat'], 0],
        ['What made the books fly away?', ['Pebble\'s tail bumped a shelf', 'Wren sneezed', 'A window opened', 'Quill clapped'], 0],
        ['What does "fluttered" mean?', ['Flapped quickly and lightly', 'Fell like rocks', 'Burned up', 'Stayed still'], 0],
        ['Why did Wren say Pebble\'s tail "found what we needed"?', ['The book that landed was about earth dragons', 'His tail could read', 'He was looking for his tail', 'Quill told her so'], 0]
      ] },
    { title: 'Night Watch', emoji: '🌙',
      text: `Each night, two students took turns guarding the dragon stables. Tonight it was Wren and Tobin's turn. The moon was bright, and the air was chilly.

Just after midnight, they heard a strange noise. Clip, clop, clip, clop. Then came a loud CRUNCH. Tobin grabbed Wren's arm. "Something is eating the hay!"

Blaze lit the tip of his tail so they could see. There, munching happily in the hay pile, were three baby goats! They had escaped from the farm pen down the hill.

Wren laughed with relief. Pebble gently nudged the goats out the door, and Blaze's glowing tail lit the path as the friends led them home.`,
      qs: [
        ['What job did Wren and Tobin have?', ['Guarding the dragon stables', 'Cooking dinner', 'Cleaning the library', 'Feeding fish'], 0],
        ['What sound did they hear first?', ['Clip, clop', 'Roar', 'Splash', 'Ding, dong'], 0],
        ['What was really eating the hay?', ['Three baby goats', 'A wolf', 'A dragon', 'Lord Vex'], 0],
        ['How did Blaze help?', ['He lit his tail so they could see', 'He chased the goats', 'He ate the hay', 'He flew to the farm'], 0],
        ['How did Wren feel when she saw the goats?', ['Relieved', 'Furious', 'Scared', 'Bored'], 0]
      ] }
  ],
  4: [
    { title: 'The Great Cake Disaster', emoji: '🎂',
      text: `It was Master Oona's birthday, and the students wanted to surprise her with a cake.

"Blaze can bake it," Tobin said proudly. "His fire is perfect for baking!"

Blaze took a deep breath and blew. WHOOSH! When the smoke cleared, the cake was as black as a lump of coal.

"Maybe Ripple can cool it down," Mira suggested. Ripple sprayed it with water. Now the cake was black and soggy.

Wren stared at the mess. Then she had an idea. "Pebble, can you make a plate?"

Pebble tapped the table, and a smooth, glowing green plate of stone appeared. They set the sad little cake on top and covered it with fresh berries and flowers.

When Master Oona saw it, she laughed so hard that she had to sit down. "This," she said, wiping her eyes, "is the best cake I have ever been given."`,
      qs: [
        ['Why were the students making a cake?', ['It was Master Oona\'s birthday', 'It was Wren\'s birthday', 'They were hungry', 'It was a test'], 0],
        ['What went wrong when Blaze baked it?', ['It burned black', 'It melted', 'It flew away', 'It turned blue'], 0],
        ['What did Ripple\'s water do to the cake?', ['Made it soggy', 'Made it perfect', 'Made it freeze', 'Made it grow'], 0],
        ['What did Pebble make?', ['A glowing stone plate', 'A new cake', 'A candle', 'A card'], 0],
        ['Why did Master Oona call it the best cake?', ['Because her students made it with love and it made her laugh', 'Because it tasted perfect', 'Because it was huge', 'Because she was teasing them'], 0]
      ] },
    { title: 'Lost in the Maze', emoji: '🌿',
      text: `Behind the academy was a giant hedge maze. "Today's lesson," said Master Oona, "is to find your dragon in the middle. You will start on opposite sides."

Wren entered the maze alone. The green walls were so tall she couldn't see over them. Left, right, left again. Soon she had no idea where she was.

"Pebble?" she called. There was no answer.

Wren stopped and closed her eyes. She remembered their very first lesson. She breathed slowly and reached out with her mind.

There! She felt a warm hum, like a tiny tug, coming from her right.

"This way," she whispered. She followed the feeling around corner after corner. The hum grew stronger and warmer with every step.

Finally, she turned one last corner and found Pebble sitting in the center of the maze, wagging his tail.

"What took you so long?" he teased. "I've been waiting for ages!"`,
      qs: [
        ['What was the lesson in the maze?', ['Find your dragon in the middle', 'Find the exit fast', 'Pick flowers', 'Hide from Master Oona'], 0],
        ['Why couldn\'t Wren see where she was going?', ['The hedge walls were too tall', 'It was night', 'She lost her glasses', 'It was foggy'], 0],
        ['What did Wren do when she was lost?', ['Closed her eyes and reached out with her mind', 'Cried for help', 'Climbed the hedge', 'Went back to start'], 0],
        ['What did she feel that guided her?', ['A warm hum, like a tug', 'A cold wind', 'A loud noise', 'A map in her pocket'], 0],
        ['Was Pebble really upset that Wren took so long?', ['No, he was teasing her', 'Yes, he was angry', 'Yes, he was crying', 'He was asleep'], 0]
      ] }
  ],
  5: [
    { title: 'The Dragon Who Wouldn\'t Wake', emoji: '⛰️',
      text: `Beyond the academy stood a round green hill that everyone called Old Moss. What most people didn't know was that Old Moss wasn't really a hill at all. It was an ancient earth dragon who had been sleeping for a thousand years, covered in grass and wildflowers.

One afternoon, the ground began to tremble. Cups rattled in the kitchen. Books slid off the library shelves. "Old Moss is restless," Master Oona said with a worried frown. "If he wakes up angry, he could shake the whole academy apart."

Pebble pressed his claws into the dirt and listened. Through the earth, he could feel something deep and heavy and sad. "He's having a bad dream," Pebble whispered. "He's dreaming that he's all alone."

Wren knelt beside him. "What do you do when I have a bad dream?" she asked.

"I hum to you," said Pebble.

So Pebble hummed. He hummed a low, gentle tune and sent it down through the stones, deeper and deeper, all the way to the sleeping giant. Slowly, the shaking stopped. The cups stopped rattling.

Then, on the side of the hill, a huge stone eyelid slid open. An eye as big as a wagon wheel looked straight at Pebble.

"Little one," rumbled a voice like distant thunder. "Come back tomorrow. I have something to teach you."`,
      qs: [
        ['What was Old Moss, really?', ['An ancient sleeping earth dragon', 'A normal hill', 'A castle', 'A giant tree'], 0],
        ['What happened when Old Moss got restless?', ['The ground trembled and things shook', 'It started raining', 'The flowers grew', 'The sun went dark'], 0],
        ['What was Old Moss dreaming about?', ['Being all alone', 'Eating cake', 'Flying fast', 'Lord Vex'], 0],
        ['How did Pebble calm him down?', ['He hummed a gentle tune through the stones', 'He shouted loudly', 'He threw rocks', 'He poured water'], 0],
        ['Why might Old Moss want to teach Pebble?', ['Pebble is an earth dragon like him and showed kindness', 'Pebble woke him on purpose', 'Pebble is the biggest dragon', 'Master Oona told him to'], 0]
      ] },
    { title: 'Sky Race Tryouts', emoji: '🏁',
      text: `Every spring, the academy chose a team for the Great Sky Race. Riders and their dragons would fly around the tallest mountains and back again. Everyone wanted to be on the team.

Tobin and Blaze made the team easily. So did Mira and Ripple. But Pebble still couldn't fly, so Wren sat quietly on the grass, trying not to feel sad.

Master Oona sat down beside her. "A team needs more than fast wings," she said. "It needs someone who can read the wind and the clouds. Someone who notices things. Will you be our navigator?"

Wren's eyes went wide. "Me?"

On the day of the race, Wren stood at the top of the tower with a map and a spyglass. She watched the clouds and the bending trees. "Storm coming from the north!" she called through a brass horn. "Fly low through the valley!"

The other teams flew straight into the storm and got blown off course. But the Skyfire team zipped safely through the valley and crossed the finish line first.

That night, Pebble leaned against Wren. "Next year," he whispered, "I'll be flying in that race. And you'll be on my back."`,
      qs: [
        ['What was the Great Sky Race?', ['A flying race around the tallest mountains', 'A running race', 'A swimming race', 'A cooking contest'], 0],
        ['Why couldn\'t Wren race?', ['Pebble couldn\'t fly yet', 'She was sick', 'She was too young', 'She didn\'t want to'], 0],
        ['What job did Master Oona give Wren?', ['Navigator', 'Cook', 'Judge', 'Doctor'], 0],
        ['How did Wren help the team win?', ['She warned them about a storm and told them to fly low', 'She flew the fastest', 'She cheated', 'She stopped the other teams'], 0],
        ['What lesson does this story teach?', ['There are many ways to be part of a team', 'Only the fastest matter', 'Never try new things', 'Storms are fun'], 0]
      ] }
  ],
  6: [
    { title: 'Lessons from Old Moss', emoji: '💎',
      text: `The next morning, Pebble and Wren climbed the side of Old Moss. The ancient dragon's voice rumbled up through the grass beneath their feet.

"Little one, you have great power," he said. "But power without patience is like a river without banks. It floods and destroys. Today, you will grow a crystal."

Pebble's eyes sparkled. A crystal! He pressed his claws to a flat gray stone and pushed his magic into it as hard as he could. A green crystal shot up, bigger and bigger, until suddenly, CRACK! It shattered into a hundred pieces.

Pebble's ears drooped. "I ruined it."

"You rushed it," Old Moss corrected gently. "Stone is patient. Mountains take a million years to grow. Try again, but this time, go slowly. Listen to the stone. Let it tell you how fast it wants to grow."

Pebble took a deep breath. This time, he placed his claws on the stone as gently as if it were a sleeping baby bird. He didn't push. He listened.

At first, nothing happened. Wren held her breath. Then, very slowly, a tiny point of green light appeared. It grew one delicate facet at a time, then another, and another. It took the whole afternoon. By the time the sun began to set, Pebble had grown a crystal as clear as water, glowing with a soft green heart.

It was magnificent.

Pebble carefully picked it up and placed it in Wren's hands. "For you," he said. "Because you're always patient with me."

Under the grass, Old Moss rumbled with something that sounded very much like a happy laugh.`,
      qs: [
        ['What did Old Moss say power without patience is like?', ['A river without banks', 'A bird without wings', 'A cake without frosting', 'A sky without stars'], 0],
        ['What happened to Pebble\'s first crystal?', ['It shattered because he rushed', 'It turned to water', 'It flew away', 'It was perfect'], 0],
        ['What does "delicate" mean?', ['Fine and easily broken', 'Huge and heavy', 'Loud and noisy', 'Dark and scary'], 0],
        ['How long did the second crystal take to grow?', ['The whole afternoon', 'One second', 'A million years', 'Three days'], 0],
        ['Why did Pebble give the crystal to Wren?', ['She is always patient with him', 'He didn\'t want it', 'Old Moss told him to', 'It was too heavy'], 0]
      ] },
    { title: 'The Market Day Mix-Up', emoji: '🍏',
      text: `Once a month, the students were allowed to visit the village market. The streets were bustling with people selling bread, cheese, ribbons, and toys. Wren loved the smell of cinnamon rolls drifting from the bakery.

At the top of the hill, a farmer was unloading his cart, which was piled high with apples. Suddenly, one of the cart's wheels snapped. The cart tipped over, and hundreds of apples went tumbling down the steep street.

"Look out!" someone shouted.

The apples bounced and rolled faster and faster. A little boy was standing right in their path, holding a balloon and staring in surprise. People screamed. Chickens flapped. It was complete chaos.

"Pebble, a wall!" Wren cried.

Pebble slammed his front feet onto the cobblestones. A low stone wall rose up across the street, just in front of the little boy. The apples hit the wall with a hundred soft thuds and piled up safely behind it.

Blaze flew down and carried the boy back to his mother. Ripple washed the dusty apples clean with a gentle spray. Mira and Tobin helped the farmer gather them into baskets.

The grateful farmer gave each dragon a reward: a shiny red apple. Blaze gobbled his in one bite. Ripple tossed hers in the air and caught it.

Pebble sniffed his apple and quietly handed it to Wren. Then he wandered over to the stone wall he had built, picked out a nice red pebble, and crunched it happily.

"Some things," Wren laughed, "never change."`,
      qs: [
        ['What does "bustling" mean?', ['Busy and full of people', 'Empty and quiet', 'Cold and wet', 'Dark and scary'], 0],
        ['What caused the apples to roll down the hill?', ['A wheel on the cart snapped', 'A dragon knocked them', 'An earthquake', 'The farmer threw them'], 0],
        ['Who was in danger?', ['A little boy with a balloon', 'Master Oona', 'The farmer\'s horse', 'Tobin'], 0],
        ['How did Pebble stop the apples?', ['He built a stone wall', 'He ate them', 'He caught them', 'He blew them away'], 0],
        ['Why did Wren say "some things never change"?', ['Pebble still preferred rocks over apples', 'The market was always busy', 'The cart always breaks', 'Blaze always eats fast'], 0]
      ] }
  ],
  7: [
    { title: 'The Ice Caves', emoji: '🧊',
      text: `In the middle of winter, Master Oona led the students on an expedition to the Frostfang Caves, high in the snowy mountains. Deep inside the caves grew glowcrystals, which the academy used to light its lanterns through the long, dark winter nights.

The caves were breathtaking. Icicles hung from the ceiling like crystal chandeliers, and the frozen walls shimmered blue and silver. Every footstep echoed.

"Stay together," Master Oona warned. "The ice here can be thin."

Tobin spotted a cluster of glowcrystals sparkling on the far side of a frozen pool. "I'll grab those!" he called, and before anyone could stop him, he stepped onto the ice.

CRACK.

The ice gave way beneath him, and Tobin vanished through a hole in the floor. A moment later, his voice echoed up from below. "I'm okay! But I'm in a lower cave, and I can't climb out. The walls are too slippery!"

Blaze roared and rushed toward the hole, flames already flickering in his throat.

"Wait!" Mira shouted. "If you use fire, you'll melt the ice ceiling above us. The whole cave could collapse!"

Blaze froze. Smoke curled from his nostrils, but he swallowed his fire. He looked desperately from the hole to Mira.

Mira knelt beside Ripple. "Water can become ice," she said slowly. "Ripple, can you make stairs?"

Ripple closed her eyes. She drew water from the frozen pool and shaped it, step by step, into a spiral staircase that curled down into the darkness. Each step froze solid as soon as it formed. But the steps were thin, and they creaked under their own weight.

"Pebble," Wren said, "can you make them stronger?"

Pebble laid his claws on the cave floor. Threads of green stone spread through the ice like roots, weaving beneath every step until the staircase was as sturdy as a castle tower.

Tobin climbed up, shivering. Blaze wrapped his warm wings around him, careful to keep his fire gentle and low.

Back at the academy that night, Master Oona spoke to the students beside a crackling fireplace. "Today you learned something important," she said. "The most powerful magic is not always the right magic. Sometimes the strongest thing a dragon can do is hold back, and let a friend help instead."

Blaze rested his head on Tobin's lap and sighed. He understood.`,
      qs: [
        ['Why did the students go to the Frostfang Caves?', ['To collect glowcrystals for lanterns', 'To find the Star Egg', 'To go ice skating', 'To hide from a storm'], 0],
        ['What happened to Tobin?', ['He fell through thin ice into a lower cave', 'He got lost in the snow', 'He froze solid', 'He found a treasure'], 0],
        ['Why did Mira stop Blaze from using fire?', ['It could melt the ceiling and make the cave collapse', 'Fire is against the rules', 'Blaze was too tired', 'Tobin was scared of fire'], 0],
        ['How did Ripple and Pebble work together?', ['Ripple made ice stairs and Pebble made them stronger with stone', 'They both used fire', 'Pebble dug a tunnel alone', 'Ripple carried Tobin'], 0],
        ['What did Master Oona say was the lesson?', ['The most powerful magic is not always the right magic', 'Always use your strongest power', 'Never go into caves', 'Ice is stronger than fire'], 0]
      ] },
    { title: 'Mira\'s Secret Fear', emoji: '🫧',
      text: `The Flying Exam was only three days away, and every student had to pass it. Each rider would fly with their dragon from the top of the academy tower, around the bell, and back down to the courtyard.

Mira seemed excited about it. She talked about the exam at breakfast, lunch, and dinner. But Wren noticed something strange. Every time they practiced on the tower, Mira found a reason to leave early. Her hands shook. Her face turned pale.

That evening, Wren found Mira sitting alone beside the pond, with Ripple floating quietly nearby.

"You don't have to tell me," Wren said, sitting beside her. "But I think you might be scared of heights."

Mira was quiet for a long time. Then her eyes filled with tears. "Water dragons are supposed to be calm and brave," she whispered. "Everyone thinks I'm the calm one. If they find out I'm scared, they'll think I don't deserve Ripple."

Wren picked up a smooth stone and turned it over in her fingers. "Do you know what happened to me on the fog bridge in my dreams last night? I looked down, and I froze. I'm scared of falling too."

Mira looked up, surprised. "You are?"

"Everyone's scared of something," Wren said. "Master Oona says courage isn't about not being scared. It's about being scared and taking one small step anyway."

The next morning, the two girls climbed the tower together. They didn't go to the top. They went up just three stairs, then stopped and breathed. The next day, they went up ten. Ripple and Pebble waited patiently at the bottom, sending warm, steady feelings through their bonds.

By the third day, Mira could stand at the very top. Her knees still trembled. But she held Wren's hand, looked straight ahead at the sky instead of down at the ground, and nodded.

When it was her turn for the exam, Mira climbed onto Ripple's back. Ripple flew in a smooth, steady circle around the bell, as gentle as a boat on a quiet lake. They landed softly in the courtyard, and the whole school cheered.

Mira ran straight to Wren and hugged her. "I was still scared the whole time," she laughed.

"I know," Wren said, grinning. "That's what made it brave."`,
      qs: [
        ['What did students have to do in the Flying Exam?', ['Fly around the bell and land in the courtyard', 'Race to the mountains', 'Swim across the pond', 'Write a test'], 0],
        ['What clues showed that Mira was scared?', ['She left practice early, her hands shook, and she turned pale', 'She laughed a lot', 'She ate too much', 'She talked about it all day'], 0],
        ['Why didn\'t Mira want anyone to know?', ['She worried people would think she didn\'t deserve Ripple', 'She wanted to win a prize', 'She was angry at Wren', 'She forgot'], 0],
        ['How did Mira and Wren practice?', ['A few more stairs each day', 'Jumping off the roof', 'Closing their eyes', 'Flying at night'], 0],
        ['What does Wren mean by "That\'s what made it brave"?', ['Being brave means doing it even when you\'re scared', 'Mira was not really scared', 'Bravery means never feeling fear', 'Ripple did all the work'], 0]
      ] }
  ],
  8: [
    { title: 'Vex\'s First Lesson', emoji: '🌬️',
      text: `When Lord Vex returned to Skyfire Academy, the students weren't sure what to think. He no longer wore his purple cloak. Instead, he wore the same plain gray robe as everyone else, and he insisted that people simply call him Vex.

Master Oona gave him the same jobs as every first-year student. He swept the courtyard. He cleaned the stables. He sat in the back row of Wren's very first lesson, the one about listening to dragons, looking enormously uncomfortable among a crowd of seven-year-olds.

"He looks miserable," Tobin whispered.

"He looks like he's trying," Wren whispered back.

Every evening, Vex did something curious. He carried a basket of fresh fish to the edge of the eastern cliffs, set it down on a flat rock, and then walked twenty paces away and sat in the grass. He didn't call out. He didn't wave. He just waited.

One evening, Wren and Pebble followed him, hiding behind a boulder.

"What is he waiting for?" Pebble whispered.

As the sun sank low, a shape appeared over the distant mountains. It was a wild wind dragon, sleek and silver, with a single dark stripe along its back. It circled high above the cliffs, watching Vex suspiciously. Then it dove, snatched a fish from the basket, and soared away.

Vex didn't move. He didn't try to follow it. He simply smiled a little, picked up the empty basket, and walked back to the academy.

"He's been doing this for weeks," Wren realized. "He's not trying to catch it. He's letting it decide whether to trust him."

Night after night, the wind dragon came a little closer. First it landed on the rock. Then it stayed long enough to eat two fish instead of one. Then, one cool evening, it landed in the grass just a few feet from where Vex sat.

They looked at each other for a long, silent moment.

Then Vex said, very softly, "You have the same stripe that Thunder had. Are you one of his children?"

The wind dragon tilted its head. It took one cautious step forward, and then another. At last, it lowered its long silver neck and rested its chin, very lightly, on Vex's shoulder.

Vex closed his eyes. A single tear rolled down his cheek.

From behind the boulder, Wren felt Pebble's warm hum against her hand. "He's learning," Pebble said quietly. "It's slow. But he's learning."

"Like a crystal," Wren whispered, and Pebble smiled, because he knew exactly what she meant.`,
      qs: [
        ['How had Vex changed when he returned?', ['He wore a plain gray robe and did first-year jobs', 'He became the headmaster', 'He wore a golden crown', 'He refused to work'], 0],
        ['What did Vex do every evening?', ['Left fish for a wild dragon and waited quietly', 'Practiced sword fighting', 'Read in the library', 'Flew around the tower'], 0],
        ['What was special about the wild dragon?', ['It had the same stripe as Thunder', 'It was made of fire', 'It could talk', 'It was the Star Egg dragon'], 0],
        ['Why didn\'t Vex chase the dragon?', ['He wanted it to decide to trust him on its own', 'He was too tired', 'He was afraid of it', 'Master Oona said not to'], 0],
        ['What did Wren mean by "Like a crystal"?', ['Trust grows slowly and patiently, like Pebble\'s crystal', 'Vex was made of glass', 'The dragon was shiny', 'Vex was going to break'], 0]
      ] },
    { title: 'Breeze Chooses', emoji: '🌤️',
      text: `As the seasons turned, Breeze grew bigger, and the weather at Skyfire Academy became very interesting. When Breeze was happy, the sky was a perfect blue. When Breeze was grumpy, it drizzled. And once, when the cook ran out of Breeze's favorite honey cakes, it hailed for an entire afternoon.

Everyone wondered who Breeze would finally bond with. Older students tried to impress the young storm dragon. They showed off their best flying tricks. They brought presents. Breeze watched politely, but nothing happened.

Then, in early autumn, a new student arrived. Her name was Fen. She had traveled from a fishing village far across the sea, and she was smaller and quieter than anyone else in her class. She didn't have a dragon. She hadn't been chosen yet, and she spent most of her time alone, sketching clouds in a battered notebook.

Wren noticed her right away. She remembered what it felt like to be new, with a dragon who couldn't fly and no idea where she belonged. So Wren sat with Fen at lunch, and Pebble showed her how to make a stone glow, and Tobin taught her a terrible joke about a dragon who couldn't stop hiccupping.

One afternoon, a sudden storm swept over the academy. Thunder boomed. Rain hammered the windows. Everyone hurried inside, except for Fen, who was standing alone in the courtyard, her notebook clutched against her chest, staring up at the sky.

"Fen!" Wren shouted from the doorway. "Come inside!"

But Fen didn't move. "It's not an angry storm," she called back. "It's a lonely one. Can't you feel it?"

High above, a silver-blue shape spiraled down through the clouds. Breeze landed in the courtyard in front of Fen, sparks crackling along its scales, wind whipping its wings.

Fen didn't run. She didn't command. She simply held out her notebook and opened it. Every page was filled with drawings of clouds: fluffy ones, stormy ones, sunrise clouds painted in pink and gold.

"I draw the sky when I miss home," she said softly. "I think maybe you miss something too."

Breeze leaned forward and looked at the drawings for a long time. Then it pressed its forehead gently against Fen's.

Instantly, the rain stopped. The clouds peeled back, and a rainbow arched across the entire sky, brighter than any Wren had ever seen.

Master Oona appeared beside Wren in the doorway, smiling. "Of course," she murmured. "A storm dragon doesn't need someone powerful. It needs someone who understands storms."

Fen turned around, her face shining with joy, as Breeze curled its tail around her like a hug.

Wren felt the familiar warm hum in her hand. She looked down at Pebble, who was grinning from ear to ear.

"Remember when that was us?" he asked.

"I remember," said Wren. "And look at us now."`,
      qs: [
        ['How did Breeze\'s moods affect the academy?', ['They changed the weather', 'They changed the food', 'They moved the castle', 'They made dragons sleep'], 0],
        ['Why didn\'t the older students\' tricks work?', ['Breeze wasn\'t looking for someone who showed off', 'Breeze was asleep', 'The tricks were too easy', 'Breeze had already left'], 0],
        ['Why did Wren befriend Fen?', ['She remembered how it felt to be new and not belong', 'Master Oona ordered her to', 'Fen had a dragon', 'Fen was famous'], 0],
        ['What did Fen\'s notebook show?', ['Drawings of clouds and sky', 'Maps of the academy', 'Pictures of dragons', 'Recipes'], 0],
        ['What does Master Oona mean by "someone who understands storms"?', ['Someone who knows what it\'s like to feel lonely or stormy inside', 'A weather scientist', 'Someone who is very strong', 'Someone who is never sad'], 0]
      ] }
  ]
};
for (const [n, list] of Object.entries(DAUGHTER_EXTRA)) {
  DAUGHTER_TRACK.levels[n - 1].stories.push(...list);
}

/* ============================================================
   GIANNA — "The Sunny Day Club" friendship series (original).
   Four friends run a helper club from Rosie's treehouse:
   Rosie (big ideas), Priya (organized, keeps the club notebook),
   Jules (artist), and Lena (new girl, can fix anything).
   Neighbors: Mrs. Lee (dog Noodle, cat Pepper), Mr. Ortiz (garden),
   Mrs. Park (toddler twins Max and Mia).
   ============================================================ */
const DAUGHTER_CLUB = {
  1: [
    { title: 'The Club Begins', emoji: '🌻',
      text: `Rosie had a big idea. "Let's start a club!" she said. "We can help people on our street."

Priya and Jules said yes. They met in Rosie's tree house. Jules made a sign. It said, "The Sunny Day Club. We Help!"

They hung the sign on the gate. Then they sat and waited for their very first job.`,
      qs: [
        ['Whose idea was the club?', ['Rosie\'s', 'Priya\'s', 'Jules\'s', 'Mom\'s'], 0],
        ['What does the club want to do?', ['Help people on their street', 'Win a race', 'Bake cakes', 'Find a dragon'], 0],
        ['Where did they meet?', ['In Rosie\'s tree house', 'At school', 'At the park', 'In a barn'], 0],
        ['Who made the sign?', ['Jules', 'Rosie', 'Priya', 'Mrs. Lee'], 0],
        ['How do you think the girls felt as they waited?', ['Excited', 'Angry', 'Sleepy', 'Bored'], 0]
      ] },
    { title: 'Noodle Goes for a Walk', emoji: '🐕',
      text: `Mrs. Lee had a big dog named Noodle. "Can you walk him?" she asked. The club said yes!

Noodle saw a cat and ran. He pulled Rosie down the street. "Help!" she cried.

Priya and Jules grabbed the leash too. All three held on tight. Noodle stopped. "Next time," said Priya, "we all hold on from the start."`,
      qs: [
        ['What was the club\'s first job?', ['Walking a dog', 'Washing a car', 'Baking bread', 'Painting a fence'], 0],
        ['What is the dog\'s name?', ['Noodle', 'Pepper', 'Pebble', 'Max'], 0],
        ['Why did Noodle run?', ['He saw a cat', 'He was hungry', 'He heard a bell', 'It started raining'], 0],
        ['How did they stop Noodle?', ['All three held the leash', 'They gave him a treat', 'They yelled', 'They let him go'], 0],
        ['What did they learn?', ['Work together from the start', 'Dogs are bad', 'Never walk dogs', 'Run faster'], 0]
      ] }
  ],
  2: [
    { title: 'The New Girl', emoji: '📦',
      text: `A moving truck stopped on Maple Lane. A girl with two long braids climbed out. She sat on a box and looked at her feet.

"She looks lonely," said Jules. So the club walked over. "Hi! We're the Sunny Day Club," said Rosie. "Want to see our tree house?"

The girl's name was Lena. When she saw the tree house, she pointed at the wobbly ladder. "I can fix that," she said. And she did! Lena became the club's fourth member.`,
      qs: [
        ['What stopped on Maple Lane?', ['A moving truck', 'A bus', 'A fire truck', 'An ice cream truck'], 0],
        ['Why did the club go say hi?', ['The girl looked lonely', 'She called them', 'She had a dog', 'She was crying loudly'], 0],
        ['What is the new girl\'s name?', ['Lena', 'Rosie', 'Priya', 'Mia'], 0],
        ['What did Lena fix?', ['The wobbly ladder', 'A bike', 'A clock', 'The sign'], 0],
        ['What does this story show about the club?', ['They are kind to new people', 'They only want old friends', 'They are bossy', 'They don\'t like the tree house'], 0]
      ] },
    { title: 'Lemonade for the Library', emoji: '🍋',
      text: `The town library needed new books. The club wanted to help, so they made a lemonade stand.

Rosie squeezed the lemons. Priya counted the cups. Jules painted a bright yellow sign. Lena built a little table.

The first neighbor took a sip and made a sour face. "Oh no," said Priya. "We forgot the sugar!" They stirred in sugar and honey. Soon there was a long line. They raised twenty dollars for the library!`,
      qs: [
        ['Why did the club make a lemonade stand?', ['To help the library buy books', 'To buy toys', 'For a birthday', 'Because they were thirsty'], 0],
        ['What was Lena\'s job?', ['Building a table', 'Counting cups', 'Painting a sign', 'Squeezing lemons'], 0],
        ['Why did the first neighbor make a sour face?', ['They forgot the sugar', 'The cup was dirty', 'It was too cold', 'It had salt'], 0],
        ['How much money did they raise?', ['Twenty dollars', 'Five dollars', 'One hundred dollars', 'Nothing'], 0],
        ['What does "raised" mean in this story?', ['Collected money', 'Lifted up', 'Grew taller', 'Woke up'], 0]
      ] }
  ],
  3: [
    { title: 'Twin Trouble', emoji: '👶',
      text: `Mrs. Park worked at home, but she needed quiet time for an important phone call. "Could the club play with my twins for one hour?" she asked. "I'll be right in the next room."

The twins, Max and Mia, were three years old and very fast. The moment the club arrived, Max ran toward the kitchen and Mia ran toward the stairs.

"Wait!" Rosie called, but they didn't listen.

Priya thought quickly. "Let's play Follow the Leader!" she announced, marching in a silly circle and flapping her arms like a chicken.

Max and Mia stopped. They giggled. Then they lined up right behind her. For the rest of the hour, the twins happily followed the club around the playroom, hopping, tiptoeing, and quacking.

When Mrs. Park came back, she smiled. "How did you keep them together?"

"We just made it a game," said Priya.`,
      qs: [
        ['Why did Mrs. Park need help?', ['She had an important phone call', 'She was going on a trip', 'She was sick', 'She was at the store'], 0],
        ['How old were the twins?', ['Three', 'Five', 'One', 'Seven'], 0],
        ['What problem happened first?', ['The twins ran in different directions', 'The twins fell asleep', 'The power went out', 'The dog ran away'], 0],
        ['What was Priya\'s idea?', ['Play Follow the Leader', 'Read a book', 'Call Mrs. Park', 'Turn on the TV'], 0],
        ['What lesson did the club learn?', ['Turning things into a game can help', 'Yelling works best', 'Twins never listen', 'Hide from toddlers'], 0]
      ] },
    { title: 'The Missing Notebook', emoji: '📒',
      text: `Priya kept the club notebook. It had every job, every phone number, and every dollar the club had earned. She carried it everywhere.

One Saturday, the notebook was gone. Priya searched her backpack, her bedroom, and the tree house. "Without it, we won't know which jobs we promised!" she cried.

Lena noticed something on the tree house floor: a trail of colored pencil shavings. They led to the corner, where Jules sat drawing, the notebook open on her lap.

"Jules!" said Priya. "That's our club notebook!"

Jules looked up, surprised. "I'm sorry! I ran out of paper, and I only used the back pages."

Priya flipped to the back. Jules had drawn a beautiful picture of all four friends in the tree house. Priya's frown slowly turned into a smile.

"Okay," she said. "But next time, ask first. And maybe we should buy you a sketchbook."`,
      qs: [
        ['What was in the club notebook?', ['Jobs, phone numbers, and money earned', 'Only drawings', 'Recipes', 'Spelling words'], 0],
        ['Why was Priya so worried?', ['They wouldn\'t know which jobs they promised', 'It was expensive', 'It was her birthday present', 'Her mom would be mad'], 0],
        ['What clue did Lena find?', ['Colored pencil shavings', 'Muddy footprints', 'A feather', 'A note'], 0],
        ['Why did Jules use the notebook?', ['She ran out of paper', 'She wanted to hide it', 'She was angry', 'Priya asked her to'], 0],
        ['What is the lesson for Jules?', ['Ask before using someone else\'s things', 'Never draw', 'Hide your notebook', 'Always use pencils'], 0]
      ] }
  ],
  4: [
    { title: 'Two Jobs, One Saturday', emoji: '📅',
      text: `On Friday night, Priya opened the club notebook and gasped. "Uh-oh. We promised to walk Noodle at ten o'clock tomorrow."

"So?" asked Rosie.

"We ALSO promised to help Mr. Ortiz plant his garden at ten o'clock," Priya said. "We can't be in two places at once!"

Everyone was quiet. Then Lena said, "Maybe we can. There are four of us."

"Two people walk Noodle, and two people help Mr. Ortiz," Jules suggested.

"But Noodle is really strong," Rosie worried. "Remember last time?"

"Then you and I take Noodle," said Priya. "We'll both hold the leash from the start."

On Saturday, the plan worked. Rosie and Priya walked Noodle all the way around the park. Jules and Lena planted twenty tomato plants with Mr. Ortiz.

That evening, Priya made a new rule in the notebook: "Check the calendar BEFORE saying yes."`,
      qs: [
        ['What problem did Priya find?', ['Two jobs at the same time', 'A lost dog', 'A broken tree house', 'No jobs at all'], 0],
        ['Who suggested splitting into two teams?', ['Jules', 'Rosie', 'Mr. Ortiz', 'Mrs. Lee'], 0],
        ['Why did Rosie worry about walking Noodle?', ['Noodle is really strong', 'She doesn\'t like dogs', 'It might rain', 'Noodle bites'], 0],
        ['How many tomato plants did they plant?', ['Twenty', 'Ten', 'Four', 'One hundred'], 0],
        ['What new rule did Priya make?', ['Check the calendar before saying yes', 'Only one job a month', 'No more dogs', 'Rosie decides everything'], 0]
      ] },
    { title: 'Jules Feels Left Out', emoji: '🎨',
      text: `At club meetings, Rosie always had the big ideas. Priya always had the plans. Lena could fix anything.

Jules just sat in the corner, quietly doodling. "What do I even do for the club?" she wondered sadly.

One day, she stopped coming to meetings. The others noticed right away.

"Where's Jules?" asked Lena. "Is she sick?"

They walked to her house and found her on the porch steps. "I'm not good at anything the club needs," Jules said softly.

Rosie looked surprised. "Jules, who made our sign? Who painted the lemonade stand? Everyone on Maple Lane knows about us because of your art!"

"You make people notice us," Priya added. "That's important."

Jules looked up. "Really?"

"Really," said Lena. "We need a Club Artist. It's an official job."

The next day, Jules designed bright new flyers. By Saturday, the club had three new jobs.`,
      qs: [
        ['How did Jules feel at the start?', ['Left out, like she didn\'t matter', 'Proud', 'Excited', 'Angry at Rosie'], 0],
        ['What did Jules do when she felt that way?', ['Stopped coming to meetings', 'Started yelling', 'Quit painting', 'Moved away'], 0],
        ['Which example shows Jules helped the club?', ['She made the sign and painted the stand', 'She walked Noodle', 'She fixed the ladder', 'She kept the notebook'], 0],
        ['What new job did they give Jules?', ['Club Artist', 'Club Boss', 'Dog Walker', 'Money Counter'], 0],
        ['What happened because of Jules\'s flyers?', ['The club got three new jobs', 'The club closed', 'It rained', 'Rosie got mad'], 0]
      ] }
  ],
  5: [
    { title: 'The Tomato Mystery', emoji: '🍅',
      text: `Mr. Ortiz's tomatoes were finally ripe and red. But every morning, a few more were missing. Some had bites taken out of them and were left on the ground.

"Can the Sunny Day Club solve this?" he asked.

Priya opened the notebook to a fresh page and wrote CLUES at the top. Clue one: the tomatoes disappeared at night. Clue two: there were small, hand-shaped prints in the dirt. Clue three: the lid of the trash can was knocked over.

"Hand-shaped prints and a messy trash can," said Lena slowly. "I think I know who it is."

That night, the girls had a stakeout. They sat by Rosie's window with flashlights and snacks. Just after nine o'clock, they saw them: a mother raccoon and three fuzzy babies, tiptoeing into the garden.

"They're so cute!" whispered Jules.

"They're also eating all the tomatoes," Rosie whispered back.

The next day, Lena helped Mr. Ortiz build a little fence with a gate that latched. Jules painted a sign that said "Raccoons, please use the other restaurant!" And Mr. Ortiz left a bowl of old vegetable scraps by the woods, far from the garden.

The tomatoes were safe. The raccoons still got dinner. Everyone was happy.`,
      qs: [
        ['What was happening to Mr. Ortiz\'s tomatoes?', ['They were disappearing at night', 'They turned blue', 'They wouldn\'t grow', 'They were too big'], 0],
        ['Which clue pointed to raccoons?', ['Hand-shaped prints and a knocked-over trash lid', 'Feathers', 'Hoof prints', 'Glitter'], 0],
        ['What is a "stakeout"?', ['Watching quietly to see what happens', 'A kind of fence', 'A cooking contest', 'A sleepover game'], 0],
        ['How did they protect the garden?', ['A fence with a gate that latched', 'A scary dog', 'Loud music', 'They picked all the tomatoes'], 0],
        ['Why did Mr. Ortiz leave scraps by the woods?', ['So the raccoons could still eat somewhere else', 'To trap them', 'To grow more tomatoes', 'To feed Noodle'], 0]
      ] },
    { title: 'The Big Argument', emoji: '⚡',
      text: `"We should take every job we can get!" said Rosie, waving her arms. "That's how we'll become the best club in town."

"No," said Priya firmly. "If we take too many jobs, we'll do them badly. We should only take the jobs we can do well."

"That's boring!"

"That's responsible!"

Their voices got louder and louder. Jules covered her ears. Finally, Rosie stomped down the tree house ladder. "Maybe there shouldn't even BE a club!" she shouted.

The tree house was very quiet.

The next day, Lena knocked on Rosie's door, then on Priya's. "Can we meet?" she asked. "Just for ten minutes."

When they were all together, Lena handed each girl a piece of paper. "Write down what you think the other person is trying to say. Not what you think. What THEY think."

Rosie wrote: "Priya wants us to do a good job so people trust us."

Priya wrote: "Rosie wants the club to grow so we can help more people."

They read each other's papers and both started laughing. "We actually want the same thing," said Rosie.

They made a new plan: take new jobs, but only one more each week. And they agreed that nobody would say "no club" ever again.`,
      qs: [
        ['What did Rosie want?', ['To take every job they could get', 'To close the club', 'To only take one job', 'To make Priya the boss'], 0],
        ['What did Priya want?', ['Only jobs they could do well', 'Every job possible', 'No jobs at all', 'To buy a new notebook'], 0],
        ['What does "responsible" mean here?', ['Doing what you promise, and doing it well', 'Being loud', 'Being the fastest', 'Having fun only'], 0],
        ['What did Lena ask them to write?', ['What the other person was trying to say', 'A list of jobs', 'An apology letter', 'A new club name'], 0],
        ['What did they discover?', ['They wanted the same thing', 'They should quit', 'Lena should be the boss', 'Jules was right all along'], 0]
      ] }
  ],
  6: [
    { title: 'Lena\'s Secret Worry', emoji: '💌',
      text: `For a whole week, Lena was quiet. She stopped fixing things. She didn't laugh at Jules's jokes. When Priya asked what was wrong, Lena just shrugged and said, "Nothing."

But the club could tell it wasn't nothing.

Finally, Rosie gently asked again. This time, Lena's eyes filled with tears. "My mom might get a new job in another state," she whispered. "We've moved four times already. Every time I make friends, I have to say goodbye."

The tree house was silent. Jules reached over and squeezed Lena's hand.

"We don't know what will happen yet," Priya said carefully. "But whatever happens, you'll always be part of the Sunny Day Club."

That night, the other three girls had a secret meeting. They decided to make Lena something special: a memory book. Jules drew pictures of every job they had done together. Priya wrote down funny moments, like the day Noodle dragged Rosie down the street. Rosie collected a leaf from the tree house tree and pressed it between two pages.

On Friday, they gave Lena the book. She turned the pages slowly, laughing and crying at the same time.

Then her phone buzzed. It was a message from her mom. Lena read it, and her face lit up like the sun.

"Mom decided to stay!" she shouted. "We're not moving!"

The club cheered so loudly that Noodle started barking three houses away.

Lena hugged the memory book to her chest. "I'm keeping this forever anyway," she said. "Because now I know what real friends look like."`,
      qs: [
        ['How did the club know something was wrong with Lena?', ['She was quiet and stopped fixing things', 'She told everyone right away', 'She was yelling', 'She stopped coming to school'], 0],
        ['What was Lena worried about?', ['Moving away again', 'A test at school', 'Her lost dog', 'A broken tool'], 0],
        ['What did the club make for Lena?', ['A memory book', 'A cake', 'A new tree house', 'A painting of a dragon'], 0],
        ['What does it mean that Lena was "laughing and crying at the same time"?', ['She felt happy and emotional together', 'She was confused', 'She was hurt', 'She was being silly'], 0],
        ['Why does Lena keep the book even though she isn\'t moving?', ['It shows her what real friends look like', 'She has to return it', 'It\'s valuable money', 'Her mom told her to'], 0]
      ] },
    { title: 'Rain on the Neighborhood Fair', emoji: '☔',
      text: `Every summer, Maple Lane held a Neighborhood Fair. This year, the Sunny Day Club was in charge of the kids' corner. They had planned for weeks.

Lena built a beanbag toss. Jules painted faces. Priya made a schedule so everything ran on time. Rosie was in charge of the biggest event: a three-legged race.

The morning of the fair was bright and sunny. But at noon, dark clouds rolled in. Then came thunder. Then came rain, pouring down in buckets.

Families grabbed their things and ran for cover. The kids in the line for face painting looked like they might cry.

"The whole fair is ruined," Rosie groaned.

Priya was already flipping through the notebook. "Not ruined. Just moved. Mr. Ortiz said we could use his garage if we ever needed it."

The girls sprang into action. Lena and Rosie carried the beanbag toss. Jules wrapped her paint set in a plastic bag. Priya ran ahead to open the garage door.

Within fifteen minutes, the kids' corner was back in business. The garage was crowded and cozy. Rain drummed on the roof like a drum band. Jules painted lightning bolts on everyone's cheeks, because it seemed appropriate.

Rosie even changed the three-legged race into a three-legged dance contest, since there wasn't room to run.

At the end of the day, Mr. Ortiz said it was the best fair in years. "Anyone can plan a party for sunny weather," he said. "It takes a real team to save one in a storm."`,
      qs: [
        ['What was the club in charge of at the fair?', ['The kids\' corner', 'The food tables', 'The music', 'Parking'], 0],
        ['What went wrong?', ['A thunderstorm started', 'Nobody came', 'Lena got hurt', 'The paint spilled'], 0],
        ['Where did they move the kids\' corner?', ['Mr. Ortiz\'s garage', 'The library', 'The tree house', 'A tent'], 0],
        ['Why did Rosie change the race into a dance contest?', ['There wasn\'t room to run', 'Nobody wanted to race', 'It was too hot', 'She lost the ropes'], 0],
        ['What did Mr. Ortiz mean about a "real team"?', ['A good team can solve problems when plans go wrong', 'Teams only work when it\'s sunny', 'Storms ruin everything', 'Parties should be indoors'], 0]
      ] }
  ],
  7: [
    { title: 'The Search for Pepper', emoji: '🐈‍⬛',
      text: `Mrs. Lee knocked on the tree house ladder, looking frantic. "Pepper is missing!" she said. Pepper was her small black cat, with one white paw like a sock. "She slipped out last night, and she has never been gone this long."

The club got to work immediately.

Jules made posters with a drawing of Pepper, so neighbors would know exactly what she looked like. Priya pulled out a map of Maple Lane and drew a grid of squares across it. "If we search one square at a time," she explained, "we won't miss anywhere, and we won't search the same place twice."

Lena packed a flashlight, a can of cat food, and a spoon. "Cats come when they hear a spoon tapping on a can," she said. "My grandma taught me that."

Rosie knocked on every door, asking neighbors to check their sheds, porches, and garages.

They searched square after square. They looked under bushes and behind fences. Hours passed. The sun began to set, and the girls grew tired and worried.

"Maybe she's gone for good," Jules said quietly.

"Not yet," said Priya, tapping the map. "We still have one square left."

The last square was the Johnsons' house. The Johnsons had been cleaning out their garage that week, and there were stacks of cardboard boxes everywhere.

Lena knelt down in front of the boxes and tapped the spoon on the can. Tink, tink, tink.

At first, nothing. Then a tiny, muffled sound: "Mew."

The girls froze. Tink, tink, tink. "Mew!" It was coming from inside a box labeled HOLIDAY DECORATIONS.

Rosie carefully opened the flaps. There, curled up in a nest of tinsel, was Pepper, blinking at them sleepily. She must have wandered into the open garage and gotten closed in when the Johnsons shut the door.

When they carried Pepper home, Mrs. Lee burst into happy tears. She hugged each girl one by one.

That night, Priya added a new page to the club notebook. At the top, she wrote, "Lost Pet Plan," and listed every step they had used. "Just in case," she said, "someone else ever needs us."`,
      qs: [
        ['What did Pepper look like?', ['A small black cat with one white paw', 'A big orange cat', 'A white dog', 'A gray kitten with stripes'], 0],
        ['Why did Priya draw a grid on the map?', ['So they would search everywhere without repeating', 'To play a game', 'To find buried treasure', 'To draw Pepper'], 0],
        ['What trick did Lena\'s grandma teach her?', ['Tapping a spoon on a can of cat food', 'Whistling loudly', 'Leaving out milk', 'Calling the cat\'s name softly'], 0],
        ['Where was Pepper found?', ['In a box of holiday decorations in a garage', 'Up a tree', 'Under Mrs. Lee\'s bed', 'At the park'], 0],
        ['Why did Priya write a "Lost Pet Plan"?', ['So the club can help again if another pet goes missing', 'Because Mrs. Lee asked for it', 'To sell it', 'For a school project'], 0]
      ] },
    { title: 'Rosie Takes Charge (Too Much)', emoji: '📣',
      text: `After the success of the fair and the search for Pepper, the Sunny Day Club became famous on Maple Lane. Everyone wanted to hire them. And Rosie, who had started the club, began to feel very important.

"Priya, you'll walk Noodle on Monday," she announced at the next meeting. "Jules, make twenty new flyers by tomorrow. Lena, fix Mrs. Park's fence on Wednesday. I'll handle the important phone calls."

The others looked at each other. Nobody said anything.

The next week, Rosie gave even more orders. She changed Jules's flyer colors without asking. She told Priya she was writing in the notebook "too slowly." When Lena suggested a new idea, Rosie said, "No, my way is better," without even listening.

On Saturday, Rosie climbed into the tree house for the meeting. It was empty. On the floor was a note in Priya's neat handwriting:

"Rosie, we're taking a break from the club. It doesn't feel like OUR club anymore. It feels like yours."

Rosie sat down hard. Her cheeks burned. At first, she felt angry. Didn't they know she was the leader? But as she sat alone, she started to remember. She remembered Jules's sign, Priya's grid map, and Lena's spoon trick. The club's best moments hadn't come from her orders. They had come from everyone's ideas.

Rosie took out a pen and wrote three letters, one for each friend. Each letter said the same thing at the end: "I'm sorry. I forgot that a leader is supposed to listen."

The next day, all four girls sat in the tree house together. Rosie had a new idea, but this time it was a different kind of idea.

"From now on, we vote," she said. "Every big decision. Everyone gets one vote, including me."

"And everyone gets a turn to lead a job," Priya added.

They voted on it right then. The vote was four to zero.`,
      qs: [
        ['Why did Rosie start feeling very important?', ['The club became famous and she had started it', 'She won a prize', 'She was the oldest', 'Her mom said so'], 0],
        ['Which is an example of Rosie being bossy?', ['Changing Jules\'s flyer colors without asking', 'Fixing a fence', 'Walking Noodle', 'Writing in the notebook'], 0],
        ['What did Rosie find in the empty tree house?', ['A note saying the others were taking a break', 'A new sign', 'Pepper the cat', 'A birthday cake'], 0],
        ['What did Rosie realize about the club\'s best moments?', ['They came from everyone\'s ideas', 'They came only from her orders', 'They were just luck', 'They never happened'], 0],
        ['What does "a leader is supposed to listen" mean?', ['Good leaders care about everyone\'s ideas', 'Leaders should be quiet', 'Leaders never talk', 'Leaders follow orders'], 0]
      ] }
  ],
  8: [
    { title: 'One Year of Sunshine', emoji: '🎉',
      text: `It had been exactly one year since Jules painted the very first sign: "The Sunny Day Club. We Help!" The paint had faded a little in the sun and rain, but it still hung proudly on the gate.

To celebrate, the girls climbed into the tree house with a box of cupcakes and the club notebook. Priya opened it to the first page.

"Job number one," she read. "Walk Noodle." Everyone groaned and laughed at the same time. Rosie rubbed her elbow, remembering how Noodle had dragged her down the street.

They kept reading. The lemonade stand that raised twenty dollars for the library. The day Max and Mia ran in two directions at once. The raccoon family in Mr. Ortiz's garden. The thunderstorm fair. The search for Pepper. They even read about the week the club almost fell apart, twice.

"Do you know how many jobs we've done?" Priya asked. She had counted. "Eighty-seven."

"Eighty-seven!" Jules gasped. "That's a lot of helping."

Just then, they heard voices outside. Lots of voices. The girls peeked out the window and stared.

All of Maple Lane was standing in Rosie's backyard. Mrs. Lee was there with Noodle and Pepper. Mr. Ortiz held a basket of tomatoes. Mrs. Park stood with the twins, who were now four and holding a giant banner. Even the Johnsons had come, and the librarian from the town library.

The banner said: "THANK YOU, SUNNY DAY CLUB!"

The girls climbed down the ladder, too surprised to speak. Mrs. Lee stepped forward. "For a whole year," she said, "you four have helped every single one of us. Today, we wanted to help you."

The neighbors had built something under a sheet next to the tree. Mr. Ortiz pulled the sheet away. It was a beautiful wooden bench, painted bright yellow, with four names carved into the back: ROSIE, PRIYA, JULES, LENA.

"For club meetings when the tree house gets too crowded," said Mr. Ortiz with a wink.

That evening, after everyone had gone home, the four friends sat on their new bench and watched the sun go down.

"Do you remember why we started this club?" Rosie asked.

"To help people," said Priya.

"I think it helped us too," said Lena quietly. "I came here with no friends. Now I have three best ones."

Jules didn't say anything. She just pulled out her sketchbook and began to draw the four of them, sitting together on the yellow bench, in the very last light of a sunny day.`,
      qs: [
        ['What were the girls celebrating?', ['The club\'s one-year anniversary', 'Rosie\'s birthday', 'The end of school', 'A new member'], 0],
        ['How many jobs had the club done?', ['Eighty-seven', 'Twenty', 'One hundred', 'Twelve'], 0],
        ['What did the neighbors give the club?', ['A yellow bench with their names carved in it', 'A new tree house', 'Money', 'A puppy'], 0],
        ['What did Lena mean by "I think it helped us too"?', ['The club gave the girls friendship', 'The neighbors paid them a lot', 'They got stronger', 'They learned to paint'], 0],
        ['Why do you think the neighbors all came together?', ['To thank the club for a year of help', 'Because Mrs. Lee lost Noodle', 'For a fair', 'Because of a storm'], 0]
      ] },
    { title: 'The Littlest Member', emoji: '🌱',
      text: `Rosie's little sister, Daisy, was five years old, and she followed the club everywhere. She sat at the bottom of the tree house ladder during meetings. She trailed behind them on dog walks. She drew her own Sunny Day Club signs in crayon and taped them to her bedroom door.

"Can I join?" she asked for the hundredth time.

"You're too little," Rosie said, for the hundredth time. "Club jobs are hard work."

Daisy's lip trembled, and she walked away without a word.

Priya watched her go. "Rosie," she said slowly, "how old were we when we started wanting to help people?"

Rosie thought about it. "I don't know. Little, I guess."

"Maybe being little doesn't mean you can't help," said Lena. "It just means you help in a different way."

The club called a vote, the way they had promised to do for every big decision. They talked about what Daisy could do safely. She couldn't walk Noodle; he was bigger than she was. She couldn't use Lena's tools. But she could water Mr. Ortiz's plants with a small watering can. She could help Jules color in flyers. She could play with Max and Mia, who were almost her age.

The vote was four to zero, again.

That evening, Rosie knocked on Daisy's bedroom door. Daisy was lying on her bed, still sad.

"Daisy," Rosie said, "the Sunny Day Club has a new program. It's called the Sunny Sprouts. It's for helpers who are still growing. And we need a first member."

Daisy sat straight up. "Me?"

"You," said Rosie. She held out a small yellow badge that Jules had made. It had a tiny green sprout painted on it.

Daisy pinned it to her shirt and ran to the mirror. Then she ran back and threw her arms around her big sister.

On Saturday, Daisy watered every one of Mr. Ortiz's tomato plants, very carefully, one at a time. When she finished, Mr. Ortiz shook her hand like a grown-up. "Excellent work, Sprout," he said.

Daisy beamed so brightly that, for a moment, Rosie thought she looked exactly like the club's very first sign.

That night, Priya opened the club notebook and wrote a new heading: "Members." Under it, she carefully added a fifth name.`,
      qs: [
        ['Why did Rosie keep saying no to Daisy at first?', ['She thought Daisy was too little', 'Daisy was mean', 'The club was full', 'Daisy didn\'t want to help'], 0],
        ['What did Lena say about being little?', ['You can help in a different way', 'Little kids can\'t help', 'Little kids should wait', 'Little kids are bossy'], 0],
        ['How did the club decide to let Daisy join?', ['They voted, four to zero', 'Rosie decided alone', 'Mom told them to', 'Daisy won a contest'], 0],
        ['What is the Sunny Sprouts?', ['A program for young helpers', 'A garden', 'A kind of flower', 'A new club name'], 0],
        ['How has Rosie changed since "Rosie Takes Charge"?', ['She listens and lets the group vote', 'She is bossier', 'She left the club', 'She stopped helping'], 0]
      ] }
  ]
};

DAUGHTER_TRACK.series = { quest: { name: 'Dragon Academy', emoji: '🐉' }, club: { name: 'The Sunny Day Club', emoji: '🌻' } };
DAUGHTER_TRACK.levels.forEach(L => L.stories.forEach(s => { s.series = s.series || 'quest'; }));
for (const [n, list] of Object.entries(DAUGHTER_CLUB)) {
  list.forEach(s => s.series = 'club');
  DAUGHTER_TRACK.levels[n - 1].stories.push(...list);
}

// Legendary dragons: [emoji, name, type, level they unlock at]
DAUGHTER_TRACK.rewards.push(
  ['🌟','Starfire','legendary star',4], ['🌈','Aurora','legendary rainbow',5], ['💎','Diamondheart','legendary crystal',6],
  ['☄️','Cometwing','legendary comet',7], ['🌌','Celestia','legendary galaxy',8]
);

/* ============================================================
   GIANNA — chapter book: "The Lighthouse on Gull Island" (original).
   A Sunny Day Club summer mystery in 8 chapters. Lena's grandma, Nana June,
   lives by the sea; an old lighthouse starts blinking a secret signal.
   Shelved as a chapter book (see BOOK_DEFS), not in the rank story lists.
   ============================================================ */
const LIGHTHOUSE_BOOK = [
  { title: 'A Summer Surprise', emoji: '🌊', series: 'club',
    text: `On the last day of school, Lena ran up the tree house ladder waving a letter. "Guess what? My Nana June invited the whole Sunny Day Club to stay with her for a week. She lives right by the sea!"

Rosie squealed. Priya opened the club notebook and started a packing list. Jules was already drawing waves in the margin.

Three weeks later, the four friends climbed out of Lena's mom's car in a little town called Gull Harbor. The air smelled like salt and sunscreen. Seagulls cried over the docks, and fishing boats bobbed in the water like toys in a bathtub.

Nana June's cottage was small and blue, with a porch that creaked when you stepped on it. Nana June herself was tall and tan, with a long silver braid and a laugh that made everyone want to laugh too.

"Welcome, sunshine club!" she said, hugging each of them. "Your beds are in the attic. And from the attic window, you get the best view in town."

The girls raced upstairs. Through the round attic window, they could see the whole harbor. Out past the boats, on a rocky little island, stood a tall white lighthouse with a red stripe around its middle.

"That's Gull Island Lighthouse," Nana June said from the doorway. "It guided ships for a hundred years. But it has been closed and dark for thirty years now. Nobody goes out there anymore."

Jules pressed her nose to the glass. "It looks lonely," she said.

"It does," Nana June agreed softly. For a moment she looked far away, as if she were remembering something. Then she clapped her hands. "Who wants fish tacos?"

That night, the girls fell asleep to the sound of waves. None of them knew that their quiet seaside vacation was about to turn into the biggest mystery the Sunny Day Club had ever solved.`,
    qs: [
      ['Who invited the club to the sea?', ['Lena\'s Nana June', 'Mrs. Lee', 'Mr. Ortiz', 'Rosie\'s mom'], 0],
      ['What is the name of the town?', ['Gull Harbor', 'Maple Lane', 'Skyfire', 'Sandy Point'], 0],
      ['What could the girls see from the attic window?', ['A lighthouse on an island', 'A castle', 'A big city', 'A volcano'], 0],
      ['How long has the lighthouse been closed?', ['Thirty years', 'Three days', 'One year', 'A hundred years'], 0],
      ['Why do you think Nana June "looked far away"?', ['She was remembering something about the lighthouse', 'She was sleepy', 'She was looking for her glasses', 'She was angry'], 0]
    ] },
  { title: 'The Light in the Night', emoji: '💡', series: 'club',
    text: `Jules couldn't sleep. The attic was warm, and the moon was so bright that it painted a white square on the floor. She tiptoed to the round window with her sketchbook, hoping to draw the harbor at night.

That's when she saw it.

Out on Gull Island, at the very top of the dark lighthouse, a light flashed. Then it flashed again. Jules rubbed her eyes. The light blinked three quick times, then three long times, then stopped.

"Rosie," Jules whispered, shaking her friend's shoulder. "Priya! Lena! Wake up. The lighthouse is blinking!"

The girls crowded around the window in their pajamas. For a long minute, nothing happened. Rosie yawned. "Maybe you dreamed it."

Then the light came again. Blink, blink, blink. Blink... blink... blink.

"Three short and three long," Priya said, grabbing the club notebook and her flashlight. She wrote it down carefully, with the time: 11:42 at night.

"But Nana said nobody goes out there," Lena whispered. "It's been dark for thirty years."

"Then who is turning on the light?" asked Rosie.

The light didn't come again that night, even though they watched until their eyes drooped. At breakfast, they told Nana June everything. She was flipping pancakes, and when Jules described the pattern, three short and three long, the spatula slipped right out of her hand and clattered onto the stove.

"Are you sure?" Nana June asked quietly. "Exactly that pattern?"

Priya showed her the notebook. Nana June stared at the page for a long time. Then she picked up the spatula and smiled, but it was a puzzled kind of smile.

"Well," she said, "it must be a boat's light, reflecting off the old glass. Eat up, girls. The pancakes are getting cold."

But after breakfast, Lena pulled her friends aside. "Nana always tells the truth," she said. "But I don't think she told us everything."`,
    qs: [
      ['Why was Jules at the window?', ['She couldn\'t sleep and wanted to draw', 'She heard a noise', 'Rosie woke her up', 'She was looking for a boat'], 0],
      ['What pattern did the light make?', ['Three short, then three long', 'One long flash', 'Five quick flashes', 'It stayed on all night'], 0],
      ['What did Priya write in the notebook?', ['The pattern and the time', 'A grocery list', 'A poem', 'A map'], 0],
      ['What happened when Nana June heard about the pattern?', ['She dropped the spatula', 'She laughed loudly', 'She called the police', 'She went back to bed'], 0],
      ['Why does Lena think Nana didn\'t tell them everything?', ['Nana seemed surprised and puzzled by the pattern', 'Nana was angry', 'Nana said she was tired', 'Nana forgot their names'], 0]
    ] },
  { title: 'Clues at the Harbor', emoji: '⚓', series: 'club',
    text: `"Every good mystery starts with clues," Priya announced, opening the notebook to a fresh page. "Let's go to the harbor and ask questions."

The docks were busy with fishermen unloading their morning catch. An old man with a white beard was coiling a rope beside a green boat called the Sea Biscuit.

"Excuse me," said Rosie politely. "Do you know anything about the lighthouse on Gull Island?"

The man looked up. "Name's Mr. Baptiste. I've fished these waters for fifty years. That lighthouse has been locked tight since the last keeper moved away. His name was Walt Harper. Kind man. Had a son about your age, once." He chuckled. "Well, that son would be a grandpa now."

"Has anyone been out there lately?" asked Priya, pencil ready.

Mr. Baptiste scratched his beard. "Funny you ask. A few days ago, I saw a little rowboat tied up at the island's dock. Thought maybe someone was fishing off the rocks."

Priya wrote quickly. Clue one: the light. Clue two: a rowboat at the island.

Lena wandered to the end of the dock, where the rowboats were tied. She knelt down. "Look at this," she called. In the soft mud at the edge of the water were footprints. Small ones, only a little bigger than their own sneakers. Next to them was a crumpled paper bag from Gull Harbor Bakery.

"Kid-sized footprints," Jules said, sketching them. "And somebody likes cinnamon rolls."

Priya added clue three and clue four. Then she frowned. "We have clues, but no answers."

Rosie was staring across the water at the lighthouse. "We could row out there ourselves and look."

"Absolutely not," said Priya and Lena at the same time.

"The water is deep, and the tide is strong," Lena added. "We'd need a grown-up."

Rosie sighed. "Fine. But I bet the answer is out on that island."

As they walked back up the hill, nobody noticed a boy in a yellow raincoat watching them from behind a stack of lobster traps.`,
    qs: [
      ['Who is Mr. Baptiste?', ['A fisherman who has fished there for fifty years', 'The lighthouse keeper', 'Nana June\'s brother', 'A baker'], 0],
      ['Who was the last lighthouse keeper?', ['Walt Harper', 'Mr. Ortiz', 'Mr. Baptiste', 'Sam Harper'], 0],
      ['What did Lena find at the end of the dock?', ['Kid-sized footprints and a bakery bag', 'A key', 'A treasure map', 'A flashlight'], 0],
      ['Why wouldn\'t Priya and Lena row out to the island?', ['The water is deep and they need a grown-up', 'They were scared of seagulls', 'They had no time', 'The boat was broken'], 0],
      ['What do you think the boy in the yellow raincoat has to do with the mystery?', ['He might be the one making the footprints and the light', 'He is a fisherman', 'He is lost', 'He is Rosie\'s brother'], 0]
    ] },
  { title: "Nana June's Old Journal", emoji: '📔', series: 'club',
    text: `The next day, rain drummed on the cottage roof, so the girls stayed inside. Nana June asked them to help clean out a closet, and Jules found an old wooden box tucked behind some winter coats.

Inside the box were shells, a faded ribbon, a tiny brass compass, and a journal with a cracked leather cover. On the first page, in neat handwriting, it said: "June Lewis, age 10. PRIVATE!"

"Nana's last name used to be Lewis," Lena said. "This is her journal from when she was a kid!"

The girls looked at each other. "We shouldn't read it without asking," said Priya.

So they carried the box to the kitchen. Nana June was making soup. When she saw the journal, she put down her spoon and sat at the table. "Oh my," she said softly. "I haven't seen this in a very long time." She opened it carefully and began to read aloud.

"July 3rd. Walt showed me the lighthouse lamp today. It is as big as a car! His dad is the keeper, so Walt knows every one of the 112 stairs."

"Walt Harper!" Rosie gasped. "Mr. Baptiste told us about him!"

Nana June smiled and turned the page. "July 9th. Walt and I made up a secret signal. When he wants to meet me at the beach, he flashes his lantern from the top of the lighthouse. Three short flashes and three long flashes means MEET ME. I answer from my window with my flashlight."

The kitchen went completely silent. Rain pattered against the window.

"Three short and three long," Jules whispered. "That's the signal we saw!"

Nana June's eyes were shining. "Walt and his family moved away when we were twelve. We wrote letters for a while, but then we lost touch. Nobody else in the world knew that signal. Nobody but Walt and me."

"Then who is flashing it now?" asked Lena.

Nana June closed the journal and held it to her heart. "I don't know," she said. "But I think it's time we found out. Tomorrow morning, if the rain stops, we're going to Gull Island."`,
    qs: [
      ['Where did Jules find the old box?', ['In a closet behind winter coats', 'In the attic', 'At the beach', 'Under the porch'], 0],
      ['Why did the girls bring the journal to Nana instead of reading it?', ['It was private and they wanted to ask first', 'They couldn\'t open it', 'It was too heavy', 'They didn\'t like reading'], 0],
      ['What did the secret signal mean?', ['Meet me', 'Help', 'Good night', 'Go away'], 0],
      ['Who made up the signal with June?', ['Walt', 'Mr. Baptiste', 'Lena', 'Jules'], 0],
      ['Why is the signal such an important clue?', ['Only Walt and June ever knew it', 'It is written on the lighthouse', 'Every sailor uses it', 'It was in the newspaper'], 0]
    ] },
  { title: 'Across the Water', emoji: '🚣', series: 'club',
    text: `The rain stopped in the night, and the morning sky was so blue it almost hurt to look at. Nana June called Mr. Baptiste, and by nine o'clock they were all wearing orange life jackets on the deck of the Sea Biscuit.

The little boat chugged across the harbor. Waves splashed against the sides, and Rosie laughed every time salty spray hit her face. Jules held her sketchbook inside her jacket to keep it dry. Priya counted seagulls. Lena held Nana June's hand.

Up close, the lighthouse was enormous. Its white paint was peeling, and the red stripe had faded to pink. Mr. Baptiste tied the boat to the island's rickety dock, right next to a small blue rowboat.

"That's the rowboat I saw," he said.

A narrow path led up the rocks to the lighthouse door. Nana June walked slowly, touching the rough stones as if saying hello to an old friend. When they reached the door, Priya pointed at the lock. It was old and rusty, but it was hanging open.

"Someone has been here," Priya whispered.

Nana June pushed the door. It swung inward with a long, low creak. Inside, a spiral staircase twisted up into the shadows like the inside of a seashell.

"112 stairs," Nana June said. "I counted them with Walt once."

They climbed and climbed. Rosie's legs burned. Lena counted out loud. At the very top, they stepped into a round glass room filled with light. In the center stood the giant old lamp, wrapped in thick glass rings. And on a small table by the window, someone had left a sleeping bag, a stack of library books about lighthouses, a big silver flashlight, and a brass telescope.

Jules peeked through the telescope. Then she gasped. "It's pointed right at Nana June's cottage! I can see our attic window!"

Next to the telescope was a folded note. On the front, in messy handwriting, it said: "J.L."

Nana June's hand trembled as she reached for it. "J.L.," she whispered. "June Lewis. That's me."`,
    qs: [
      ['How did they get to Gull Island?', ['On Mr. Baptiste\'s boat, the Sea Biscuit', 'They swam', 'In the blue rowboat', 'On a bridge'], 0],
      ['What did Priya notice about the lock?', ['It was hanging open', 'It was brand new', 'It was missing', 'It was painted red'], 0],
      ['What does "enormous" mean in this chapter?', ['Very, very big', 'Very old', 'Very loud', 'Very small'], 0],
      ['What was the telescope pointed at?', ['Nana June\'s cottage', 'The moon', 'A ship', 'The bakery'], 0],
      ['Why did Nana June\'s hand tremble?', ['The note had her old initials on it', 'She was cold', 'She was scared of heights', 'She was tired from the stairs'], 0]
    ] },
  { title: "The Keeper's Grandson", emoji: '🧒', series: 'club',
    text: `Before Nana June could open the note, footsteps clanged on the stairs below. Everyone froze. A boy in a yellow raincoat appeared at the top, carrying a bakery bag. When he saw them, he dropped it, and a cinnamon roll rolled across the floor.

"The boy from the harbor!" Rosie exclaimed.

"Please don't be mad," the boy said quickly. "I'm allowed to be here. My mom is fixing up the lighthouse. She's going to turn it into a museum. I'm Sam. Sam Harper."

"Harper," Nana June repeated. "Are you related to Walt Harper?"

Sam's eyes went wide. "He's my grandpa! Wait, are you June? June Lewis?"

Nana June nodded, too surprised to speak.

Sam grinned so big his whole face changed. "I can't believe it! My grandpa tells stories about you all the time. About the secret signal, and the beach, and how you found a message in a bottle together."

He explained everything. His mom had found Grandpa Walt's old keeper's journal while cleaning the lighthouse. In it, Walt had written about the signal and about his best friend June. "Grandpa always wondered what happened to you," Sam said. "He lives three hours away now, and his eyes aren't good enough to drive. So when we came here this summer, I had an idea. If you still lived nearby, maybe you'd see the signal and remember."

"So you flashed it every night," Priya said, checking her notes. "That explains the light, the rowboat, and the footprints."

"And the cinnamon rolls," Jules added, picking up the roll from the floor.

Sam blushed. "I wrote the note in case you ever came. I didn't think anyone would really answer."

Nana June finally unfolded the note and read it aloud: "Dear J.L., if you can read this, my grandpa Walt still remembers you. He would love to hear from you. Please answer the signal. From, Sam."

For a moment, nobody said a word. Then Nana June laughed, and two happy tears rolled down her cheeks.

"Sam," she said, "I think we have a signal to answer."`,
    qs: [
      ['Who was the boy in the yellow raincoat?', ['Sam Harper, Walt\'s grandson', 'Mr. Baptiste\'s son', 'A lost tourist', 'Lena\'s cousin'], 0],
      ['Why is Sam\'s mom fixing the lighthouse?', ['To turn it into a museum', 'To live there', 'To sell it', 'To knock it down'], 0],
      ['Why was Sam flashing the signal every night?', ['He hoped June would see it and remember his grandpa', 'He was calling for help', 'He was playing a game with his mom', 'He wanted to scare people'], 0],
      ['Which clues did Sam\'s story explain?', ['The light, the rowboat, the footprints, and the bakery bag', 'Only the light', 'Only the footprints', 'None of them'], 0],
      ['How did Nana June feel at the end of the chapter?', ['Happy and emotional', 'Angry', 'Bored', 'Scared'], 0]
    ] },
  { title: 'Answering the Signal', emoji: '🔦', series: 'club',
    text: `That evening, the whole Sunny Day Club sat in the attic with Nana June, watching the sun sink into the sea. The sky turned orange, then pink, then deep purple. One by one, the stars came out.

Nana June held an old silver flashlight, the very same one from the wooden box. Lena had put in fresh batteries.

"Sam said he'd watch for us at nine o'clock," Priya said, checking her watch. "It's 8:59."

Everyone held their breath. Out on Gull Island, the top of the lighthouse was dark. Then, right at nine, a light blinked. Three short. Three long.

Nana June lifted her flashlight to the round window. Her hands shook a little. Click, click, click. Click... click... click.

For a long moment, the lighthouse stayed dark. Rosie squeezed Jules's hand.

Then the light on the island went wild. It blinked and flashed and swooped in circles, like a lighthouse doing a happy dance. The girls cheered so loudly that a seagull on the roof squawked and flew away.

A minute later, the cottage phone rang. Nana June answered it. "Hello?"

The girls could hear an old man's voice through the phone, shaky but warm. "June? June Lewis? Is it really you? It's Walt."

Nana June sat down slowly on the attic bed. "Hello, Walt," she said, and her voice wobbled. "It's really me. You still flash a signal like a show-off."

On the other end of the phone, Walt laughed, a big laugh that sounded just like Sam's.

The girls tiptoed downstairs to give Nana June some privacy. They could hear her laughing and talking for almost an hour.

When she finally came down, her cheeks were pink. "Walt is coming to Gull Harbor," she announced. "Sam's mom will drive him here on Saturday. That's the day the lighthouse museum opens."

"That's only four days away," said Priya, already flipping to a new page in the notebook. "And I have a feeling the museum could use some help from the Sunny Day Club."`,
    qs: [
      ['What time did Sam say he would watch for the signal?', ['Nine o\'clock', 'Noon', 'Midnight', 'Six o\'clock'], 0],
      ['What did Nana June use to answer the signal?', ['Her old silver flashlight', 'A candle', 'A mirror', 'A lantern from the store'], 0],
      ['How did the lighthouse react when June answered?', ['It blinked and flashed like a happy dance', 'It went dark forever', 'It flashed one time', 'It turned red'], 0],
      ['Who called on the phone?', ['Walt', 'Mr. Baptiste', 'Lena\'s mom', 'Mrs. Lee'], 0],
      ['Why did the girls go downstairs during the call?', ['To give Nana June privacy', 'Because they were hungry', 'Because it was bedtime', 'To find Sam'], 0]
    ] },
  { title: 'The Lighthouse Shines Again', emoji: '🗼', series: 'club',
    text: `For four busy days, the Sunny Day Club worked harder than they ever had before.

Jules painted signs for every room of the museum: "The Keeper's Kitchen," "The 112 Stairs," and "The Great Lamp." Priya made a schedule so every visitor would get a tour. Lena spent hours with Sam's mom at the top of the lighthouse, tightening bolts and polishing the giant lamp until it gleamed. And Rosie practiced being a tour guide, telling the story of the lighthouse to anyone who would listen, including the seagulls.

On Saturday morning, half of Gull Harbor rode boats out to the island. Mr. Baptiste ferried people back and forth on the Sea Biscuit, wearing his best captain's hat.

At eleven o'clock, a car pulled up at the harbor. Sam's mom helped an old man step out. He had a white mustache, a cane, and the same big grin as Sam.

Nana June walked slowly down the dock. Walt walked slowly up it. When they met in the middle, neither of them said anything at first. Then Walt held out his hand, and in it was a tiny brass compass, exactly like the one in June's wooden box.

"You still have yours?" June whispered.

"Every day for sixty years," said Walt.

Everyone on the dock cheered.

That night, after the visitors had gone home, Sam's mom flipped a big switch at the top of the lighthouse. With a deep hum, the great lamp turned on for the first time in thirty years. A beam of golden light swept across the dark water, around and around, as if the lighthouse were waking up and stretching.

The Sunny Day Club stood on the rocks with Sam, Walt, and Nana June, watching it shine.

"Do you know what the best part of this mystery was?" Rosie said.

"The cinnamon rolls," said Jules.

Everyone laughed. "No," said Rosie. "The best part was that the answer wasn't a treasure. It was a friendship."

Priya opened the notebook one last time that summer and wrote: "Case closed. Two old friends found. One lighthouse shining again."`,
    qs: [
      ['What was Lena\'s job before the museum opened?', ['Fixing and polishing the giant lamp', 'Painting signs', 'Making a schedule', 'Giving tours'], 0],
      ['What did Walt bring to show June?', ['A tiny brass compass', 'A letter', 'A flashlight', 'A photograph'], 0],
      ['What does it mean that Walt kept the compass "every day for sixty years"?', ['He never forgot his friend June', 'He needed it to find his way', 'He collects compasses', 'He found it yesterday'], 0],
      ['What happened when the lamp turned on?', ['A golden beam swept across the water', 'It broke', 'It turned blue', 'Nothing happened'], 0],
      ['According to Rosie, what was the best part of the mystery?', ['Finding a friendship, not a treasure', 'The cinnamon rolls', 'The boat ride', 'Winning a prize'], 0]
    ] }
];

