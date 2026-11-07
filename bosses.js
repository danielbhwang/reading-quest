/* ============================================================
   BOSS BATTLES — one boss guards the end of every level.
   Three great reads unlock the boss. Beat it (read well + answer the
   tough questions) to level up. Original characters only.
   text: blank line = new page · qs: [question, [options], correctIndex]
   ============================================================ */
const BOSSES = {
  son: {
    1: { name:'Grumble Gnat', e:'🦟', color:'#65a30d', taunt:'Bzzz! I buzz so loud, nobody can read!', defeat:'Bzz... okay, okay! You can read. I will be quiet now.',
      story:{ title:'Bug in the Hat', emoji:'🦟', text:`I see a bug. 🦟

The bug is in my hat. 🎩

Buzz, bug, buzz!

The bug is on the cat. 🐱

Go, bug, go!`,
      qs:[['Where was the bug first?',['🎩 In the hat','🛏️ In the bed','🚗 In a car'],0],['Where did the bug go next?',['🐱 On the cat','🐶 On the dog','🌳 Up a tree'],0],['What did the kid tell the bug?',['🏃 Go, bug, go!','😴 Go to sleep!','🍪 Eat a cookie!'],0]] } },
    2: { name:'Muddle the Mud Blob', e:'👾', color:'#92400e', taunt:'Blub blub! I mix up all the letters into MUD!', defeat:'Blub... my mud is all washed away!',
      story:{ title:'The Mud Blob', emoji:'👾', text:`A big blob sat in the mud.

The blob had a red hat.

"I can mix up a word," said the blob.

Biscuit got a big tub. Splash!

The blob is not mud. It is a fun pal!`,
      qs:[['Where did the blob sit?',['🟤 In the mud','🛁 In a tub','🌙 On the moon'],0],['What did the blob have?',['🎩 A red hat','👟 Blue shoes','🎈 A balloon'],0],['How did Biscuit stop the mud?',['🛁 With a tub of water','🔥 With fire','🧹 With a broom'],0]] } },
    3: { name:'King Slowpoke', e:'🐌', color:'#7c3aed', taunt:'I am the slowest snail. I will make you read sooo slow!', defeat:'Whoa! You read so fast, my shell is spinning!',
      story:{ title:'The Slow Snail King', emoji:'🐌', text:`"Come and play!" said Zip.

"I can not run," said the snail king. "I am too slow."

"We can help you," said Plip. "Jump on my back!"

Plip, Zip, and the snail went up the hill.

"Look at me go!" said the snail. "This is fun!"`,
      qs:[['Why could the snail king not run?',['🐌 He was too slow','😴 He was asleep','🌧️ It was raining'],0],['Who said "Jump on my back"?',['🐸 Plip','🐰 Zip','🐱 Biscuit'],0],['How did the snail feel at the end?',['😄 He had fun','😢 Sad','😠 Mad'],0]] } },
    4: { name:'Captain Crumb', e:'🦝', color:'#475569', taunt:'Har har! I stole every snack in town, and you will never catch me!', defeat:'Oh no, a reader caught me! Here, have your snacks back.',
      story:{ title:'Captain Crumb Steals the Snacks', emoji:'🦝', text:`The snacks are gone!

The cake is gone. The jam is gone too.

Biscuit sees crumbs on the rug.

The crumbs go to a big bush.

In the bush is a raccoon with a hat.

"I am Captain Crumb," he said. "I love snacks!"

"You can share," said Biscuit. "Then we can all have fun."`,
      qs:[['What was gone?',['🍰 The snacks','🧸 The toys','👟 The shoes'],0],['What clue did Biscuit find?',['🍪 Crumbs on the rug','👣 Big steps','🪶 A feather'],0],['Where did the crumbs lead?',['🌳 To a big bush','🏠 To the house','🏖️ To the beach'],0],['What did Biscuit want Captain Crumb to do?',['🤝 Share the snacks','🏃 Run away','😴 Go to bed'],0]] } },
    5: { name:'Foxy Fibber', e:'🦊', color:'#ea580c', taunt:'Hee hee! I tell tricky fibs. You can\'t tell what\'s true!', defeat:'You read every word and spotted my fibs! No more tricks, I promise.',
      story:{ title:'The Fox Who Told Fibs', emoji:'🦊', text:`A fox came to the park. "I can fly!" he said. "Give me your cake, and I will show you."

Zip shook her head. "Foxes can not fly. That is a fib."

The fox tried again. "There is a gold coin under the slide! Go and look!"

Biscuit looked. There was only a rock. "That is a fib too," he said.

The fox looked at his feet. "I tell fibs because I want friends," he said softly.

"You do not need fibs to have friends," said Biscuit. "Just play with us!"

So the fox played tag, and he was the fastest one of all. That was the truth!`,
      qs:[['What was the fox\'s first fib?',['🦅 That he could fly','🍰 That he baked a cake','🏠 That he had a house'],0],['What was really under the slide?',['🪨 Just a rock','🪙 A gold coin','🍰 A cake'],0],['Why did the fox tell fibs?',['💛 He wanted friends','😴 He was tired','🍪 He was hungry'],0],['What was TRUE at the end?',['🏃 He was the fastest at tag','🦅 He could fly','🪙 He found gold'],0]] } },
    6: { name:'Thunder Toad', e:'🐸', color:'#2563eb', taunt:'CROAK-BOOM! My thunder scares every reader away!', defeat:'Croak... you were brave AND you read it all. The storm is over.',
      story:{ title:'The Thunder Toad', emoji:'⛈️', text:`Every night, a loud BOOM shook the pond. Plip hid under his lily pad. "It is a monster," he whispered.

Biscuit grabbed his flashlight. "Let's find out what it really is."

They crept to the edge of the pond. BOOM! The sound came from a big, flat rock.

On the rock sat a huge toad with puffed-up cheeks. He took a deep breath. CROAK-BOOM!

"Why are you so loud?" asked Biscuit.

The toad blinked. "I am new here. I want everyone to know I am big and strong."

Plip swam out. "You do not have to boom to be big. Want to sing with us instead?"

The toad tried a soft little croak. Plip croaked back. Soon the whole pond was singing a gentle song, and nobody was scared at all.`,
      qs:[['Where did the BOOM come from?',['🪨 A big flat rock','☁️ A cloud','🌳 A tree'],0],['Why was the toad so loud?',['💪 He wanted everyone to know he was big and strong','😢 He was hurt','🍕 He was hungry'],0],['What did Plip invite the toad to do?',['🎵 Sing with them','🏃 Race','😴 Sleep'],0],['What is the lesson of the story?',['💛 You do not have to be loud to matter','⛈️ Storms are fun','🐸 Toads are scary'],0]] } },
    7: { name:'Professor Puzzle', e:'🦉', color:'#0f766e', taunt:'Hoo hoo! My riddles are too hard for any young detective!', defeat:'Hoo! You solved every clue. You are a true detective!',
      story:{ title:'The Riddle Tower', emoji:'🧩', text:`A note was tied to Biscuit's door with a ribbon. It said: "Come to the old clock tower. Solve my riddles, or the Pocket Pals' picnic basket stays locked forever! Signed, Professor Puzzle."

Biscuit put on his detective hat. At the tower, a wise old owl sat on a high beam. Next to him was the picnic basket, locked with a lock that had three dials.

"Riddle one," hooted the owl. "I have hands, but I cannot clap. What am I?"

Biscuit looked up at the tower. "A clock!" he said. The first dial clicked.

"Riddle two. The more you take, the more you leave behind. What am I?"

Biscuit looked down at the dusty floor and saw his own paw prints. "Footsteps!" Click went the second dial.

"Riddle three, the hardest of all. What has to be broken before you can use it?"

Biscuit thought and thought. Then his tummy rumbled. "An egg!" Click! The basket popped open.

Inside were sandwiches, apples, and, of course, hard-boiled eggs. Professor Puzzle hooted happily. "Nobody has ever solved all three! May I join your picnic?"

"Of course," said Biscuit. "But next time, just ask."`,
      qs:[['Where did the note tell Biscuit to go?',['🕰️ The old clock tower','🏫 The school','🏖️ The beach'],0],['What has hands but cannot clap?',['🕰️ A clock','🧤 A glove','🐒 A monkey'],0],['What clue helped Biscuit solve riddle two?',['🐾 His paw prints on the dusty floor','🕰️ The clock','🥚 An egg'],0],['How did Biscuit think of "egg"?',['🍽️ His tummy rumbled and he thought of food','🦉 The owl told him','📖 He read it in a book'],0],['What did Biscuit mean by "next time, just ask"?',['💛 You can make friends without tricks','🔒 Locks are fun','🦉 Owls are mean'],0]] } },
    8: { name:'The Masked Mystery', e:'🎭', color:'#be123c', taunt:'Ha! Nobody knows who I am. Not even the great Detective Biscuit!', defeat:'You... you figured it out! Nobody has ever seen behind my mask before.',
      story:{ title:'The Case of the Masked Mystery', emoji:'🎭', text:`Strange things were happening in town. The baker's best pie went missing. The library's map of the island disappeared. And someone painted a giant question mark on the town fountain. At every scene, the same note was left behind: "Catch me if you can! — The Masked Mystery."

Detective Biscuit gathered the Pocket Pals. "Let's look at the clues," he said, spreading the three notes on the table.

Chip noticed it first. "Every note smells like cinnamon," she chirped. Leafy found the second clue: tiny flecks of blue paint on each note. And Zip spotted the third: every note was written in purple crayon, with the letter s written backward.

"Cinnamon, blue paint, purple crayon, and a backward s," Biscuit said slowly. "Who in town bakes with cinnamon, paints, and is still learning to write?"

The Pals looked at each other. Then they all said it together: "Pip!"

Pip was the baker's little mouse, the youngest kid on the whole street. They found him behind the bakery, wearing a paper mask, with the map and the pie beside him.

"I wasn't trying to be bad," Pip said, pulling off the mask. "Everyone always solves mysteries without me. I wanted to make my own mystery so somebody would notice me."

Biscuit sat down next to him. "We noticed you," he said. "And your clues were really clever. How about you join the team instead?"

Pip returned the map, shared the pie, and helped paint the fountain back to normal. Then Biscuit gave him his very own tiny detective hat.

"Case closed," said Biscuit. "And we have a brand new detective."`,
      qs:[['What did the Masked Mystery leave at every scene?',['📝 A note','🥧 A pie','🗺️ A map'],0],['Which clue did Chip find?',['🍩 The notes smelled like cinnamon','🎨 Blue paint','✏️ Purple crayon'],0],['Why did the backward s matter?',['✏️ It showed the writer was still learning to write','🔤 It was a secret code','🎨 It was a painting'],0],['Why did Pip make the mystery?',['💛 He wanted someone to notice him','🥧 He was hungry','😈 He wanted to be mean'],0],['How did Biscuit solve the problem at the end?',['🕵️ He invited Pip to join the team','🚓 He called the police','🏃 He chased Pip away'],0]] } }
  },
  daughter: {
    1: { name:'Bridge Troll Bob', e:'🧌', color:'#4d7c0f', taunt:'Nobody crosses MY bridge unless they can read my sign!', defeat:'Hmph. You read it perfectly. Fine, fine, you may cross.',
      story:{ title:'The Troll at the Bridge', emoji:'🌉', text:`Wren and Pebble came to a bridge. A big green troll sat in the middle. "Stop!" he said. "Nobody can cross my bridge."

"Why not?" asked Wren.

"Because I am a troll, and trolls guard bridges," he said. He crossed his arms.

Wren saw a sign by the bridge. It had lots of words on it. The troll did not look at the sign at all.

"Can you read the sign?" Wren asked. The troll turned red. "No," he said quietly. "Nobody ever taught me."

So Wren sat down and read it to him. The sign said: "Free Bridge. Be kind to all who cross." The troll smiled for the first time in a hundred years. "Then I will be kind," he said. "And will you teach me to read?"`,
      qs:[['Who guarded the bridge?',['A big green troll','A dragon','Master Oona','A goat'],0],['What did Wren notice about the troll and the sign?',['He did not look at the sign at all','He wrote the sign','He was hiding behind it','He loved the sign'],0],['Why did the troll turn red?',['He was embarrassed that he could not read','He was sunburned','He was angry','He was cold'],0],['What did the sign really say?',['Free Bridge. Be kind to all who cross.','Keep Out!','Trolls Only','Pay One Coin'],0],['What does this story suggest about the troll?',['He was not mean, he just needed help','He was evil','He wanted gold','He was a dragon in disguise'],0]] } },
    2: { name:'Grumpwing the Gargoyle', e:'🗿', color:'#57534e', taunt:'GRRR. I am made of stone, and I never, ever smile.', defeat:'Is this... a smile? It feels nice. Thank you, rider.',
      story:{ title:'The Gargoyle Who Never Smiled', emoji:'🗿', text:`On the highest roof of Skyfire Academy sat a stone gargoyle named Grumpwing. He had sat there for three hundred years, and he had never smiled once. Every morning, he scowled at the students. Every night, he scowled at the moon.

One windy day, a little bird was blown off course and crashed into the roof. Its wing was hurt, and it was shivering.

Grumpwing grumbled. "Go away. This is my roof."

But Wren had seen everything from the courtyard. She climbed the long ladder with Pebble right behind her. She wrapped the bird in her scarf to keep it warm.

"You could help, you know," she told the gargoyle. "Your stone wings would block the wind."

Grumpwing hesitated. Then, very slowly, he stretched out one heavy stone wing over the bird. The wind stopped. The bird stopped shivering and began to sing a sweet little song.

Something strange happened to Grumpwing's face. The corners of his stone mouth cracked, just slightly, upward. It was the first smile in three hundred years.`,
      qs:[['How long had Grumpwing gone without smiling?',['Three hundred years','Three days','Thirty years','Since lunch'],0],['What happened to the little bird?',['It was blown off course and hurt its wing','It stole his hat','It fell asleep','It laid an egg'],0],['How did Grumpwing help the bird?',['He blocked the wind with his stone wing','He flew it home','He gave it food','He called a doctor'],0],['What made Grumpwing finally smile?',['Helping someone made him feel good','Wren told a joke','The sun came out','He won a prize'],0],['What does "hesitated" mean in this story?',['Paused before deciding','Ran away fast','Laughed loudly','Fell asleep'],0]] } },
    3: { name:'The Bramble Witch', e:'🧙', color:'#166534', taunt:'My thorny brambles will cover the whole academy, and you can\'t stop them!', defeat:'You understood my garden better than anyone. Perhaps I was only lonely.',
      story:{ title:'The Bramble Witch', emoji:'🌿', text:`One morning, Skyfire Academy woke up to find thorny brambles climbing every wall. They curled around the windows and covered the doors. Students had to squeeze through tiny gaps just to get to breakfast.

"The Bramble Witch has returned," said Master Oona with a sigh. "She lives in the forest and sends her thorns whenever she is upset."

Wren and Pebble followed the thickest vines into the forest. They led to a crooked cottage surrounded by a garden of dying flowers. Inside, an old woman with leaves in her hair was crying.

"Are you the Bramble Witch?" Wren asked gently.

"I only wanted my flowers to grow," she sobbed. "But the stream that waters them has dried up. I was so angry that my magic turned into thorns."

Pebble pressed his claws to the ground and listened. "A big rock fell into the stream," he said. "It's blocking the water."

Pebble's earth magic rolled the boulder aside, and cool water rushed back into the garden. Within minutes, the flowers lifted their heads. The witch laughed through her tears, and far away, every bramble at the academy turned into a rose bush.`,
      qs:[['What covered the academy?',['Thorny brambles','Snow','Spider webs','Mud'],0],['Why did the witch\'s magic turn into thorns?',['She was angry and upset that her flowers were dying','She wanted to attack the academy','She lost a game','She was bored'],0],['What was the real problem?',['A rock was blocking the stream','The sun was too hot','A dragon ate the flowers','Someone stole her seeds'],0],['How did Pebble discover the problem?',['He listened to the ground with his claws','He asked the trees','He flew above the forest','He read a map'],0],['What happened to the brambles at the end?',['They turned into rose bushes','They grew bigger','They caught fire','They turned to stone'],0]] } },
    4: { name:'The Moat Kraken', e:'🐙', color:'#1d4ed8', taunt:'Every dragon egg that rolls into my moat belongs to ME!', defeat:'A deal? A fair deal? No one has ever bargained with a kraken before!',
      story:{ title:'The Kraken in the Moat', emoji:'🐙', text:`The academy's moat was deep and dark, and everyone knew something lived at the bottom. Nobody had ever seen it, only the bubbles that rose to the surface at night.

Then, one afternoon, disaster struck. A cart carrying three brand-new dragon eggs tipped over on the drawbridge. The eggs rolled straight into the moat with three loud plops.

Before anyone could move, eight enormous purple arms rose out of the water. A kraken held all three eggs high. "Finders keepers!" it gurgled.

Tobin wanted Blaze to blast it with fire. Mira wanted Ripple to wash it away. But Wren noticed something they didn't. The kraken was cradling the eggs very carefully, the way a parent holds a baby.

"Why do you want the eggs?" she called out.

The kraken was quiet for a moment. "Because it is lonely down here," it admitted. "Nobody ever visits. I thought if I had something to take care of, I would not be alone."

Wren thought hard. "If you give the eggs back, we will visit you every week. And when the baby dragons hatch, they can learn to swim in your moat."

The kraken's eyes grew wide. Slowly, it set the eggs back on the drawbridge, one by one. Now, every Friday, the young dragons splash in the moat while the kraken teaches them to dive, and the bubbles that rise at night are the sound of it laughing.`,
      qs:[['How did the eggs end up in the moat?',['A cart tipped over on the drawbridge','A dragon dropped them','The kraken stole them from a nest','Wren threw them'],0],['What did Wren notice that the others didn\'t?',['The kraken held the eggs very carefully','The kraken was asleep','The eggs were cracked','The moat was empty'],0],['What were Tobin and Mira\'s ideas?',['To attack the kraken with fire and water','To trade gold','To run away','To call Master Oona'],0],['Why did the kraken want the eggs?',['It was lonely and wanted something to care for','It was hungry','It wanted to sell them','It hated dragons'],0],['What do the bubbles at night mean now?',['The kraken is laughing','The kraken is angry','A storm is coming','The eggs are hatching'],0]] } },
    5: { name:'The Fog Wraith', e:'👻', color:'#64748b', taunt:'Whooo... I will fill your mind with fog, and you will forget every word you read!', defeat:'Your memory is too strong... the fog... is fading...',
      story:{ title:'The Fog Wraith\'s Riddle', emoji:'🌫️', text:`For three days, a thick fog had swallowed Skyfire Academy. It was so dense that students bumped into walls, and dragons got lost on the way to their stables. Worst of all, anyone who wandered into the fog forgot things. Tobin forgot his own middle name. Mira forgot how to tie her boots. Even Master Oona forgot where she had put her staff.

"It's the Fog Wraith," whispered the librarian, Quill the owl. "It feeds on forgotten memories. The only way to stop it is to answer its riddle, but nobody can remember the answer long enough to say it."

Wren had an idea. She grabbed a notebook and a pencil. "If I write things down," she said, "the fog can't steal them from me."

She stepped into the fog with Pebble at her side. Everything turned gray and cold. A whispery voice drifted around her. "Answer my riddle, little rider. What can you keep after giving it to someone else?"

Wren felt the answer start to slip away the moment she thought of it. Quickly, she scribbled it in her notebook before it could disappear. Then she read the word out loud, clearly and slowly.

"A promise."

The fog shuddered. "How... how did you remember?"

"I wrote it down," said Wren. "Words on a page don't get lost in the fog."

The wraith let out a long sigh, and the fog began to thin. Sunlight poured through. All around the academy, students suddenly remembered everything. Tobin shouted his middle name with joy, and Master Oona found her staff exactly where she had left it, leaning against her own front door.`,
      qs:[['What did the fog do to people?',['It made them forget things','It made them sleepy','It turned them invisible','It made them sneeze'],0],['How did Wren protect her memory?',['She wrote things down in a notebook','She closed her eyes','She held her breath','She ran very fast'],0],['What was the answer to the riddle?',['A promise','A secret','A gift','A memory'],0],['Why can you "keep" a promise after giving it?',['You still have to remember it and keep it','It comes back in the mail','It is made of gold','You can buy another one'],0],['What message does this story share about reading and writing?',['Written words help us hold onto ideas','Fog is dangerous','Owls are wise','Riddles are scary'],0]] } },
    6: { name:'The Stone Giant', e:'🪨', color:'#78716c', taunt:'I am the biggest creature in the mountains. Little riders do not scare me!', defeat:'Small... but wise. I am sorry I underestimated you, Wren and Pebble.',
      story:{ title:'The Stone Giant\'s Bargain', emoji:'⛰️', text:`High in the Granite Mountains lived a stone giant so tall that clouds tangled in his hair. For months, he had been rolling boulders down the mountain into the river below. The river was slowly getting blocked, and the village of Millbrook was running out of water.

Master Oona sent Wren and Pebble to investigate. The climb took all morning. When they finally reached the top, the giant looked down at them and laughed so hard that pebbles rained from his shoulders.

"A tiny girl and a tiny dragon? What could you possibly want?"

"The village below needs its river," Wren said firmly, even though her knees were shaking. "Why are you rolling boulders into it?"

The giant stopped laughing. He pointed to a crack in the mountainside. Inside, curled up and trembling, was a baby giant made of soft, sandy stone. "My son is sick," the giant rumbled. "He is crumbling. The old stories say that a giant's child must sleep in a bed of river stones to grow strong. I have been rolling boulders to the river to make him a bed."

Wren thought carefully. "The stories didn't say the stones had to be in the river," she said. "They just have to be river stones. What if we brought the river stones up here instead?"

Pebble's eyes lit up. He pressed his claws to the mountain and called out to the earth. Smooth, round river stones began rising out of the riverbed far below, floating up the mountainside on a gentle wave of green light. Pebble arranged them into a soft, curved bed inside the crack.

The baby giant crawled into it and sighed. Almost at once, his sandy skin began to harden into strong, shiny granite.

The great giant knelt so low that his nose nearly touched the ground. "I called you tiny," he said. "But today, you were the biggest thing on this mountain." Then he rolled every boulder back out of the river, and the village of Millbrook had water once again.`,
      qs:[['What problem was the giant causing?',['He was blocking the river the village needed','He was eating all the food','He was stomping on houses','He stole the sun'],0],['Why was the giant rolling boulders?',['He was trying to make a bed of river stones for his sick son','He was angry at the village','He was playing a game','He was building a castle'],0],['What did Wren notice about the old story?',['It said river stones, not stones in the river','It was written wrong','It was about dragons','It was a lie'],0],['What does "underestimated" mean in the boss\'s last words?',['Thought someone was less able than they really were','Liked someone a lot','Was afraid of someone','Forgot someone\'s name'],0],['What does the giant mean when he says Wren and Pebble were "the biggest thing on this mountain"?',['Their wisdom and kindness mattered more than size','They grew very tall','They were standing on a rock','They were heavier than him'],0]] } },
    7: { name:'Frostbite the Ice Wyrm', e:'🐉', color:'#0891b2', taunt:'I will freeze Skyfire Academy forever. Winter will never end!', defeat:'Warm... I had forgotten how warm it feels to be remembered. Thank you.',
      story:{ title:'The Endless Winter', emoji:'❄️', text:`Spring should have arrived weeks ago, but Skyfire Academy was still buried in snow. The pond was frozen solid. Icicles as long as spears hung from every roof. The dragons huddled together for warmth, and even Blaze's fire couldn't melt the ice for more than a few seconds.

Master Oona gathered the students in the Great Hall. "There is an ice wyrm named Frostbite living in the northern caves," she said. "Every hundred years, it wakes up and tries to make winter last forever. Someone must go and speak with it."

"Speak with it?" Tobin asked. "Shouldn't we fight it?"

"Fighting an ice wyrm only makes it colder," Master Oona replied. "Anger is like ice. It spreads."

Wren, Pebble, Tobin, Mira, and their dragons set off through the snow. The journey took two days. When they finally reached the northern caves, a freezing wind blasted out of the entrance, and a long, glittering dragon made of ice slithered into the light.

"Who dares to enter my caves?" Frostbite hissed. Its breath turned the air into tiny snowflakes.

Wren stepped forward. "We came to ask why you want winter to last forever."

The wyrm's eyes narrowed. "Because in spring, everyone forgets me. In winter, I am powerful. Everyone talks about me. Everyone fears me. Fear is better than being forgotten."

Mira spoke up quietly. "I used to feel invisible too. When I first came to the academy, I thought nobody noticed me. But being feared isn't the same as being remembered."

Frostbite turned toward her. For a long moment, nobody moved.

Then Wren had an idea. She pulled out the silver crescent moon stone that Nim the moon sprite had given her. "What if we made you a promise?" she said. "Every year, on the first day of spring, the academy will hold a Festival of Frost. We'll build ice sculptures in your honor, and tell your story, and nobody will ever forget you again."

The wyrm's icy scales began to drip, as if something inside it were melting. "A festival?" it whispered. "For me?"

"For you," Wren promised.

Frostbite closed its eyes and breathed out slowly. This time, its breath was not freezing. It was cool and soft, like a spring breeze. Far away, the icicles on Skyfire Academy began to drip. The frozen pond cracked and shimmered. And by the time the friends returned home, the first green buds were appearing on the trees.

The next year, the Festival of Frost was the biggest celebration the academy had ever seen. And sitting in the place of honor, carefully not melting, was a very happy ice wyrm.`,
      qs:[['Why did Master Oona say fighting would not work?',['Fighting an ice wyrm only makes it colder','Ice wyrms are too big','The students were too young','It was against the rules'],0],['What did Frostbite really want?',['To be remembered instead of forgotten','To eat the dragons','To steal gold','To sleep forever'],0],['How did Mira connect with the wyrm?',['She shared that she used to feel invisible too','She sprayed it with water','She gave it a gift','She told a joke'],0],['What does "Anger is like ice. It spreads" mean?',['Angry feelings can grow and affect others','Ice is angry','Winter makes people mad','Ice melts in spring'],0],['Why did the wyrm\'s scales start to drip?',['Its feelings were softening because someone cared','The sun came out','Blaze used fire','It was crying from fear'],0]] } },
    8: { name:'The Shadow Storm', e:'🌪️', color:'#4c1d95', taunt:'I am every fear you have ever had. Thunder! Darkness! You cannot read your way out of ME!', defeat:'You faced every fear... and you kept going. I... have no power over you anymore.',
      story:{ title:'The Shadow Storm', emoji:'🌪️', text:`It began as a single dark cloud above the floating island. By noon, it had swallowed the sun. By evening, the Shadow Storm had wrapped itself around Skyfire Academy like a giant black cloak, swirling with purple lightning and whispering voices.

The voices were the worst part. They didn't shout. They whispered, softly and cruelly, right into each student's ear. "You're not good enough," they told Tobin. "You'll fall," they whispered to Mira. "Your dragon is too small," they hissed at Wren.

One by one, students stopped trying. Dragons curled up and hid their faces. Even Master Oona sat quietly by the fire, staring into the flames.

"What is it?" Wren asked her. "Where did it come from?"

Master Oona looked up slowly. "The Shadow Storm is made of fear," she said. "Every worry that anyone at the academy has ever had, all gathered together. It grows stronger every time someone believes what it says."

Wren felt Pebble's warm hum through their bond. It was weaker than usual, but it was still there. And she realized something important. The whispers had told her Pebble was too small. But Pebble had built a bridge out of fog. He had held a tower together in a storm. He had grown a crystal with the patience of a mountain. The whispers were wrong.

"If the storm is made of fears," Wren said slowly, "then maybe we beat it by remembering the truth."

She ran to the library and grabbed the biggest, emptiest book she could find. Then she went from room to room. "Write down one thing you did that you were scared to do," she told each student. "Something brave. Something true."

Tobin wrote: "I crossed the Fog Bridge." Mira wrote: "I passed my Flying Exam, even though I was terrified." Nim the moon sprite wrote, in tiny silver letters: "I trusted strangers, and they saved my family." Even Lord Vex, now just Vex, wrote: "I came back and asked for help."

By midnight, the book was full. Wren carried it to the very top of the tallest tower, where the storm was strongest. The wind howled. The whispers screamed. "You're nothing! You're too small! You'll fail!"

Wren opened the book and began to read aloud. Her voice shook at first. But she kept reading, one true, brave sentence after another. And with every sentence, a little patch of the storm cleared, and a star shone through.

Pebble pressed against her side and added his own voice. Then Breeze, the young storm dragon, swept down from the clouds and joined them. Breeze's wings caught the clearing wind and spun it into a bright, gentle whirlwind that scattered the last of the shadows across the sky.

When the final page was read, the Shadow Storm was gone. The sky above Skyfire Academy was full of stars, more than anyone had ever seen, as if every brave thing written in the book had become one of them.

Master Oona climbed to the tower and stood beside Wren. "Fear is loud," she said softly. "But truth, when you read it out loud, is louder."

Wren closed the book and smiled at Pebble. Somewhere far below, the dragons were waking up, stretching their wings, and getting ready to fly.`,
      qs:[['What was the Shadow Storm made of?',['Every fear and worry at the academy','Smoke from a volcano','Lord Vex\'s magic','Ice from Frostbite'],0],['How did the whispers make the storm stronger?',['It grew every time someone believed what it said','They called more clouds','They woke up dragons','They broke windows'],0],['What made Wren realize the whispers were wrong?',['She remembered all the brave things Pebble had done','Master Oona told her','She read it in a library book','Breeze explained it'],0],['Why did Wren ask everyone to write something brave and true?',['To fight fear by remembering the truth','To make a scrapbook','To finish homework','To give the book to Vex'],0],['What does Master Oona mean by "truth, when you read it out loud, is louder"?',['Remembering and saying what\'s true can overcome fear','Reading should be very loud','Storms are quiet','Books are heavier than clouds'],0]] } }
  }
};

/* Miles — bosses for levels 9–12 (Doke Detectives chapter mysteries) */
Object.assign(BOSSES.son, {
  9: { name:'The Riddle Raccoon', e:'🦝', color:'#57534e', taunt:'Hee hee! I hide things and leave riddles. No little detective can follow MY trail!', defeat:'You read every riddle and followed every clue... Okay, okay. You are a real detective.',
    story:{ title:'The Riddle Raccoon', emoji:'🦝', text:`One morning, every Dokemon ball in Max's backyard was gone. In their place was a note written in muddy pawprints and crayon: I took your balls. Solve my riddles to get them back. Signed, the Riddle Raccoon.

Max opened his Clue Notebook. Under the note was a second piece of paper with the first riddle: I have a trunk but I am not an elephant. Look under my roots.

"A trunk that isn't an elephant," Max said. "A tree has a trunk!" They ran to the big oak tree. Between its roots was a red ball and another riddle.

I have a face and two hands, but no arms or legs. Look behind me.

Nora laughed. "A clock!" Behind the clock on the garage wall was a blue ball and the third riddle.

I get wetter the more I dry. Look inside the basket.

Max thought hard. What dries things but gets wet? "A towel!" In the laundry basket, wrapped in a towel, were the last three balls and a small, sleepy raccoon.

The raccoon blinked. It had been collecting round, shiny things all night, and the riddles were written by Max's little cousin, who thought it would be a fun game.

Max laughed and wrote in his notebook: Three riddles, three clues, one sleepy raccoon. Case closed.`,
      qs:[['What did the Riddle Raccoon take?',['The Dokemon balls','Max\'s notebook','The clock','A towel'],0],['Which answer fits "I have a trunk but I am not an elephant"?',['A tree','A car','A suitcase','A whale'],0],['What has a face and two hands but no arms?',['A clock','A doll','A robot','A mirror'],0],['Who really wrote the riddles?',['Max\'s little cousin','The raccoon','Nora','Mom'],0]] } },
  10: { name:'Baron Scramble', e:'🧩', color:'#7c3aed', taunt:'Mwah ha ha! I have scrambled every sign in town. Without reading, NOBODY can find their way!', defeat:'You unscrambled my puzzles faster than I made them! I suppose... I will put the signs back.',
    story:{ title:'The Scrambled Signs', emoji:'🧩', text:`When Max woke up on Saturday, the whole town was confused. Every sign had been scrambled. The bakery sign said KYRBEA. The library sign said BRAILYR. The park sign said RAKP.

People wandered around, lost. A delivery truck drove in circles. A grandma walked into the fire station looking for muffins.

Max grabbed his Clue Notebook. "When letters are scrambled, the letters are all still there," he said. "They're just in the wrong order. We can figure them out."

He started with the shortest one. RAKP. Four letters: R, A, K, P. "Park!" he said. Nora fixed the sign.

KYRBEA was harder. Max looked for letters that often go together. B and A, K and E. "Bakery!" said Nora. The grandma got her muffins.

They fixed sign after sign. At the very end of Main Street was one last sign, taped to a door: SROSFROPE ZPZUEL.

Max studied it for a long time. "Professor... Puzzle," he read slowly.

They knocked. A small, smiling old man with a bow tie opened the door. He was the town's new puzzle maker, and he had scrambled the signs as a grand-opening game for his shop. He had not realized it would make people so lost.

"Puzzles should be fun," Max said, "but they shouldn't stop people from getting where they need to go."

Professor Puzzle agreed. He gave every kid in town a free puzzle book, and he never scrambled a real sign again.`,
      qs:[['Why was the town confused?',['Every sign was scrambled','The streets were flooded','The lights went out','Everyone lost their maps'],0],['What did Max know about scrambled words?',['All the letters are still there, just in the wrong order','They cannot be solved','They are always backwards','They are in another language'],0],['What does RAKP spell?',['Park','Rake','Pork','Pack'],0],['Why did Professor Puzzle scramble the signs?',['As a game for his shop\'s grand opening','To trick the town','To steal muffins','Because he could not spell'],0]] } },
  11: { name:'The Fog Phantom', e:'👻', color:'#64748b', taunt:'Whoooo! My fog covers the whole harbor. The boats are lost and nobody can see the truth!', defeat:'You looked past my fog and found the truth. Whooo... I mean, well done, detective.',
    story:{ title:'The Fog Phantom', emoji:'🌫️', text:`Every evening for a week, a thick gray fog rolled into the harbor at exactly six o'clock. It was so thick that fishing boats could not find their way home. And every evening, the fishermen heard a strange, low sound drifting through the fog: Whooooo.

"It's the Fog Phantom," people whispered.

Max did not believe in phantoms. He believed in evidence. He and Nora went to the harbor with Splashy and Sparko.

"Clue one," Max wrote. "Real fog comes when warm, wet air meets cold water. It can come at any time. But this fog comes at exactly six o'clock every day, like it's on a timer."

"Clue two," said Nora. "Real fog doesn't smell like anything. This fog smells a little like popcorn."

Max sniffed. She was right.

They followed the smell along the docks to a big building that used to be a movie theater. Behind it was a huge machine with a hose pointed toward the water. A sign on the side said: Fog Machine. Property of the Harbor Theater.

Inside, the theater owner was setting up for a show called The Phantom of the Sea. Every day at six, he tested his fog machine for the play, and every day the fog drifted out over the water. The Whooooo sound was the machine's big fan.

"Oh my!" said the owner when Max showed him his notebook. "I had no idea my fog was reaching the boats!"

He moved the machine inside, where the fog belonged. That night, the boats came home safely under a clear, starry sky, and every fisherman got a free ticket to the play.`,
      qs:[['Why did Max think the fog was not natural?',['It came at exactly six o\'clock every day','It was blue','It only came in winter','A fisherman told him'],0],['What did the popcorn smell help them find?',['The theater with the fog machine','A popcorn store','A boat','The phantom\'s house'],0],['What made the Whooooo sound?',['The fog machine\'s big fan','A ghost','The wind','An owl'],0],['What is the main idea of this story?',['Max uses evidence to show the "phantom" was a theater fog machine','The harbor is haunted','Fishermen love plays','Fog smells like popcorn everywhere'],0]] } },
  12: { name:'The Mastermind', e:'🎩', color:'#1e1b4b', taunt:'I have planned the greatest mystery of all. Five clues, five places, one answer. Even YOU cannot solve it!', defeat:'Brilliant. Every clue, every place, every answer. You truly are the Legendary Detective.',
    story:{ title:'The Mastermind\'s Challenge', emoji:'🎩', text:`A black envelope arrived at Max's door. Inside was a card with gold letters: I am the Mastermind. I have hidden the Golden Notebook, the greatest prize a detective can win. Follow my five clues. If you fail, it stays hidden forever.

Clue one said: Begin where the bell sleeps when it is quiet.

Max smiled. "The clock tower! The bell is quiet between the hours." At the bottom of the tower stairs, under the first step, was a second card.

Clue two: Go where a fish once hid from tapping fingers.

"The aquarium," said Nora. "Goldie's tank!" Ms. Reyes let them look. Inside Goldie's treasure chest, sealed in a plastic bag, was the third card.

Clue three: Visit the place where a coin lost its tail.

"The museum," said Max. "The fake coin had a dragon tail curled the wrong way." Dr. Patel led them to the Dragon Coin case. Taped beneath it was the fourth card.

Clue four: Find the bush that once hid a ribbon.

They hurried to the pet show field, where the big blue bush still grew. Deep inside it, Flutterbit found the fifth card.

Clue five: The Mastermind is someone who has seen every case you solved. Look beside you.

Max slowly turned to Nora. She was grinning from ear to ear and holding a gold notebook behind her back.

"You?" Max said.

"Me," said Nora. "Every clue was a place from one of our cases. I wanted to see if you remembered them all."

Max laughed and took the Golden Notebook. On the first page, Nora had written: To the Legendary Detective, from his partner. Max wrote just below it: The best detectives remember the details and never forget their friends.`,
      qs:[['Where did the first clue send Max?',['The clock tower','The library','The beach','The zoo'],0],['Why did each clue point to a different place?',['Each place was from one of Max\'s old cases','The Mastermind was lost','They were random places','Nora lived there'],0],['Who was the Mastermind?',['Nora','Professor Puzzle','Mr. Chen','Mayor Bloom'],0],['What does Max\'s last sentence mean?',['Good detectives pay attention to details and value their friends','Detectives should work alone','Notebooks are the best prize','Clues are always gold'],0]] } }
});

// Gianna's bosses for ranks 9–12 (each guards the next rank)
Object.assign(BOSSES.daughter, {
  9: { name:'Captain Gale', e:'🏴‍☠️', color:'#0f766e', taunt:'You cost me three wind dragons, little rider. Now I will take YOURS!', defeat:'Outsmarted by a map and a child... This is not over, Wren of Skyfire!',
    story:{ title:'The Chase Through the Clouds', emoji:'🏴‍☠️', text:`Wren and Pebble were flying an ordinary evening patrol over the Floating Islands when the sky ship burst out of a cloud directly in front of them.

Its gray sails snapped in the wind. Hooked ropes shot out from its rails like grasping fingers. And at the wheel stood Captain Gale, her silver hair streaming behind her and her coat of stolen dragon scales glittering in the sunset.

"Well, well," she called. "The little rider who stole my dragons. An earth dragon would fetch a fine price at the markets in the south."

Pebble twisted sharply, and a hooked rope whistled past Wren's ear. She ducked low against his neck, her heart hammering.

"We can't outfly her," Pebble said through their bond. "The ship is riding a strong current. It's faster than we are."

Wren's mind raced. They were alone. Mira, Tobin, and Fen were back at the academy. There was no one to call for help.

Then she remembered Mira's notebook.

Two weeks earlier, Mira had shown everyone her map of the island currents, with its swirling arrows and careful notes. Wren had studied it so many times that she could picture it with her eyes closed. And she remembered one warning written in Mira's neat handwriting beside the Twin Spires: DANGER. THE CURRENT BETWEEN THE SPIRES FLOWS BACKWARD AT SUNSET.

It was almost sunset now.

"Pebble," Wren whispered, "fly toward the Twin Spires. Slowly. Let her think she's catching us."

Pebble didn't question her. He banked left and flew toward two tall stone towers rising from the clouds, flapping just slowly enough to seem tired.

Behind them, Captain Gale laughed. "Running out of strength already? Full speed, crew! After them!"

The sky ship surged forward, its sails filled with the powerful current. It was gaining quickly. Fifty lengths behind them. Thirty. Twenty. Wren could hear the creak of its ropes and the shouts of the pirates.

"Now!" Wren cried. "Up!"

Pebble shot straight upward with every ounce of strength he had, rising above the spires just as the last sliver of sun touched the horizon.

The sky ship could not climb that fast. It plunged straight between the Twin Spires at full speed.

At that exact moment, the current reversed.

The wind that had been pushing the ship forward suddenly slammed into it from the front. The sails flapped wildly and then billowed backward. The ship groaned, spun in a slow circle, and began drifting helplessly away in the wrong direction, its crew shouting in confusion.

Captain Gale gripped the wheel, her face pale with fury. She turned it left and right, but the backward current held the ship like a fist.

"How?" she shouted up at Wren. "How did you know?"

"My friend made a map," Wren called down. "She studies the wind instead of stealing from it."

The ship drifted farther and farther away until it was only a dark speck against the purple sky. Captain Gale's voice echoed faintly after them.

"This is not over, Wren of Skyfire!"

Pebble flew slowly home through the twilight, tired but proud. Wren leaned forward and hugged his neck.

"You trusted me without asking a single question," she said.

"Of course," said Pebble. "That's what a bond is."

When they landed, Wren went straight to Mira's room, knocked on the door, and said, "Your map just saved my life."

Mira's mouth fell open. Then she smiled the biggest smile Wren had ever seen.`,
      qs:[['Why couldn\'t Pebble simply outfly the sky ship?',['The ship was riding a strong current and was faster','Pebble was injured','The ship had wings','It was too dark to fly'],0],['What important information did Wren remember?',['Mira\'s warning that the current between the Twin Spires flows backward at sunset','The pirates\' secret password','Where Captain Gale lived','How to speak to wind dragons'],0],['Why did Wren tell Pebble to fly slowly at first?',['To trick Gale into chasing them into the spires at full speed','Because Pebble was tired','To save energy for later','To let Gale catch them'],0],['What does Wren mean when she says Mira "studies the wind instead of stealing from it"?',['Mira learns about nature respectfully, while Gale takes from it','Mira is a thief','Mira is afraid of wind','Gale is a scientist'],0],['How did Mira feel when Wren thanked her?',['Surprised and very happy','Angry','Bored','Embarrassed and upset'],0]] } },
  10: { name:'The Iron Tempest', e:'🌩️', color:'#334155', taunt:'My storm engine is rebuilt, ten times stronger! The beacon will call every wind dragon to MY nets!', defeat:'My engine... my storm... the wind will not obey me anymore.',
    story:{ title:'Battle for the Beacon', emoji:'🌩️', text:`Three days after Vex rescued Ash from the Shattered Cliffs, the beacon at the Sky Lighthouse flickered.

Wren saw it from her bedroom window: the great white light, which had swept the northern clouds every night since Vex and Thunder lit it, stuttered and dimmed. Then it turned a sickly shade of green.

She knew that green. She had seen it crackling from the mast of Captain Gale's ship.

Within an hour, the whole crew was in the air. Wren and Pebble led the way, with Mira and Ripple, Tobin and Blaze, Fen and Breeze, and Lord Vex riding Thunder. Behind them flew dozens of wind dragons from the eastern meadow, their feathered wings beating in rhythm.

When they reached the lighthouse, their hearts sank.

Captain Gale had rebuilt her storm engine, and it was enormous. She had bolted it to the top of the lighthouse itself, wrapping iron cables around the crystal dome. Huge metal fans spun on all sides, and green lightning poured into the crystal, twisting its light into an ugly, pulsing glow.

"She's changing the beacon's call," Vex shouted over the roar of the fans. "Instead of guiding wind dragons to safety, it's pulling them into her nets!"

It was true. Below the lighthouse, enormous nets stretched between the floating islands like spider webs. Already, two confused young wind dragons were flying straight toward them, drawn by the poisoned light.

On the lighthouse balcony stood Captain Gale. "You're too late, Wren of Skyfire," she called. "The Iron Tempest is unstoppable."

The storm engine roared. A wall of wind slammed into the riders, scattering them across the sky. Tobin and Blaze tumbled end over end. Mira barely held onto Ripple's saddle.

"We can't get close!" Fen shouted.

Wren clung to Pebble, thinking desperately. They couldn't fight the wind. They had learned that already. But the Iron Tempest wasn't really a storm. It was a machine. And machines had parts.

"Pebble," she said. "The engine is bolted to the lighthouse. What's the lighthouse made of?"

Pebble's eyes began to glow amber. "Stone," he said. "Old stone. Stone I can feel."

They dove beneath the howling wind, flying low along the lighthouse wall where the fans couldn't reach. Pebble pressed his claws against the ancient stones and closed his eyes.

Deep inside the walls, the stone began to shift. Very gently, Pebble loosened every bolt that held the storm engine to the tower. One by one, they slid free.

At the same moment, Breeze flew straight into the lightning, just as she had before, and drank the green energy until she blazed like a star. The engine sputtered. Its fans slowed.

Then Thunder let out a roar that shook the clouds, and every wind dragon in the sky answered. They flew together in a great circle around the lighthouse, beating their wings in perfect rhythm, creating a wind of their own that pushed against the Iron Tempest.

With nothing holding it in place, the storm engine tipped. It slid off the top of the lighthouse, tumbled through the clouds, and splashed into a lake on the island below with a gigantic, hissing cloud of steam.

The beacon flashed back to pure, clean white.

Captain Gale stood frozen on the balcony, staring at the empty space where her machine had been. For the first time, she looked small.

Lord Vex landed Thunder beside her. "I know what it's like to want power so badly that you can't see anything else," he said quietly. "There is another way. If you want to learn it, Skyfire Academy will teach you."

Captain Gale said nothing. But she didn't run away either.`,
      qs:[['What had Captain Gale done to the beacon?',['Twisted its light with her storm engine to pull wind dragons into her nets','Broken it into pieces','Stolen the crystal','Painted it green'],0],['Why couldn\'t the riders get close at first?',['The storm engine created a wall of wind that scattered them','The lighthouse was too tall','The pirates had guards','It was too dark'],0],['What important idea did Wren have?',['The engine was a machine bolted to stone that Pebble could loosen','They should fight the wind harder','They should wait until morning','They should ask Gale to stop'],0],['How did the wind dragons help defeat the Iron Tempest?',['They flew together to create a wind of their own','They breathed fire','They attacked the pirates','They carried the lighthouse away'],0],['What does Vex\'s offer to Captain Gale show?',['He believes people can change, as he did','He wants to join the pirates','He is afraid of her','He wants her ship'],0]] } },
  11: { name:'The Hollow King', e:'👑', color:'#475569', taunt:'Words are easy, child. Face my shadows with the truth, or be lost in the dark forever.', defeat:'Your words... were not hollow. Let the light rise.',
    story:{ title:'Into the Shadows', emoji:'👑', text:`The shadows of the Hollow King rose up around Wren and Pebble like black water, cold and silent. In moments, the golden glow of the Star Well disappeared. Wren could no longer see her friends, or the walls of the well, or even her own hands.

All she could feel was Pebble's warm scales beneath her, and their bond humming faintly in her mind.

"Speak," said the Hollow King's voice from everywhere at once. "Tell me why I should believe you. But know this: my shadows feed on anything false. One untrue word, and they will swallow you."

Wren swallowed hard. She opened her mouth to say something brave, like "I'm not afraid of you."

Then she stopped. Because that wasn't true. She was very afraid.

"I'm scared," she said instead. Her voice sounded small in the darkness. "I'm really scared right now."

The shadows around her paused.

"Go on," said the Hollow King.

Wren took a shaky breath. "When I first came to Skyfire Academy, I didn't think I belonged there. Everyone else seemed braver and smarter. My dragon couldn't even fly. I used to lie awake at night thinking that someone would discover I was a mistake."

She had never told anyone this. Not even Mira.

"Sometimes I still feel that way," she continued. "Even now. Even after everything. When people call me brave, part of me thinks they're wrong."

The shadows drew back a little. A faint shimmer of gold appeared at their edges.

"Why tell me this?" asked the Hollow King. His voice sounded different now, less like wind and more like a person. "This makes you seem weak."

"Because you asked for the truth," Wren said. "And because I think you know what it feels like. To think you don't matter. To feel invisible."

There was a long, long silence.

Then Pebble spoke. Wren had never heard him speak aloud to anyone but her. His voice was deep and warm, like stones warmed by the sun.

"She is the bravest person I know," he said. "Not because she is never afraid. Because she is afraid, and she keeps going anyway. And because she always tells the truth, even when it's hard."

Wren felt tears sting her eyes.

The shadows began to crumble. Little by little, they broke apart into drifting flakes of darkness that dissolved into light. The golden glow returned, brighter than before. Wren could see her friends again at the edge of the well, staring at her in amazement.

The Hollow King stood before her on the black stone slab. His shadow robe had faded to gray, and his blue eyes no longer blazed. They looked tired and wet.

"A thousand years," he said slowly, "and no rider ever told me the truth about themselves. They only told me what they thought I wanted to hear."

He knelt and pressed his hand against the black slab. A deep crack ran across it. Then another, and another.

"Your words were not hollow, Wren of Skyfire," he said. "Let the light rise."

The slab shattered. Golden starlight exploded upward from the depths of the well, pouring past them in a dazzling river, flying out of the mountain and racing across the sky toward home.

Wren laughed through her tears. Beside her, Pebble glowed gold in the light, and for the first time, the Hollow King smiled.`,
      qs:[['What would happen if Wren said something untrue?',['The shadows would swallow her','The well would freeze','Pebble would fly away','The Hollow King would leave'],0],['Why did Wren decide not to say "I\'m not afraid of you"?',['It was not true, and only the truth could protect her','She forgot the words','Pebble told her not to','She wanted to make the King angry'],0],['What secret did Wren share?',['She often felt she did not belong and that people were wrong to call her brave','She had stolen a book','She did not like Pebble','She wanted to leave the academy'],0],['According to Pebble, what makes Wren brave?',['She is afraid but keeps going, and she tells the truth','She is never afraid','She is the strongest rider','She can fly the fastest'],0],['Why did the Hollow King finally free the light?',['Wren was the first rider in a thousand years to tell him the truth about herself','Wren gave him treasure','Pebble broke the slab','The other riders attacked him'],0]] } },
  12: { name:'The Mirror Wyrm', e:'🪞', color:'#7c3aed', taunt:'I am every doubt you have ever had, wearing your own face. How can you defeat YOURSELF?', defeat:'You saw yourself clearly... and you were not afraid. Rise, Dragon Master.',
    story:{ title:'The Trial of the Dragon Master', emoji:'🪞', text:`One month after the first Festival of the Longest Night, Master Oona called Wren to her study.

The festival had been magnificent. Every rider had carried a lantern into the evening sky, and Lord Vex had led the whole academy in singing Umbra's lullaby, while Mira's enormous painting of the Twilight Queen glowed on the wall of the Great Hall. High above them, Umbra had spread her wings slowly, and the stars had come out one by one, brighter than anyone had ever seen.

Now Master Oona sat behind her desk, looking unusually serious.

"Wren," she said, "the Council of Masters has voted. They believe you are ready for the Trial of the Dragon Master."

Wren's mouth fell open. "But I'm too young. Nobody my age has ever..."

"Nobody your age has ever done what you have done," Master Oona said gently. "But the Trial is not about what you've done. It's about who you are. Only you can decide whether to face it."

That evening, Wren and Pebble stood at the entrance of the Hall of Mirrors, a round chamber beneath the oldest tower of the academy. Its walls were covered with tall, silver mirrors, and the air inside felt cold and still.

"I'll be right beside you," said Pebble.

"I know," said Wren, and they stepped inside.

The door closed behind them. For a moment, nothing happened. Then every mirror began to glow, and from the largest one, something slithered out.

It was a dragon made entirely of mirror glass. Its long, sinuous body reflected the room in a thousand broken pieces. And when it turned its head toward Wren, she saw that its face was her own face, cold and smirking.

"Hello, Wren," said the Mirror Wyrm, in her own voice. "I know everything about you. Every doubt. Every fear. Every mistake."

Its reflections filled the mirrors around her. In one, she saw herself as a scared first-year, crying because Pebble couldn't fly. In another, she saw herself shouting at Tobin during a silly argument last spring. In another, she saw herself lying awake, whispering, "I don't belong here."

"This is who you really are," the Mirror Wyrm hissed. "A frightened little girl pretending to be brave. You're not a Dragon Master. You never will be."

Wren felt her old fears rising up inside her, cold and heavy. For a moment, she almost believed it.

Then she looked at the mirror more carefully.

Yes, there she was, crying as a first-year. But beside her was Pebble, tiny and scared, and she was holding him tightly, promising they'd learn together. Yes, there she was shouting at Tobin. But in the next reflection, she was apologizing, and Tobin was laughing and forgiving her. Yes, there she was lying awake, afraid. But in the morning, she always got up and tried again.

"You're showing me the truth," Wren said slowly. "But only half of it."

The Mirror Wyrm's smile flickered.

"I was scared," Wren said, her voice growing stronger. "I made mistakes. I still have doubts. All of that is true. But I also kept going. I learned. I said sorry. I helped my friends, and they helped me." She stepped toward the glittering dragon. "You're not the whole me. You're just the part that's afraid. And I'm not ashamed of you."

Then she did something the Mirror Wyrm did not expect. She reached out and gently placed her hand on its glass face.

The Wyrm shuddered. Cracks spread across its body like frost on a window. Then, instead of shattering, it melted into soft silver light that flowed up her arm and settled warmly in her heart.

The mirrors went quiet. Every one of them now showed the same reflection: Wren and Pebble, standing side by side, glowing.

The door opened. Master Oona stood there, with Lord Vex, Mira, Tobin, Fen, and all their dragons gathered behind her.

"The Trial is not about defeating your fears," Master Oona said, her eyes shining. "It's about understanding them. Wren of Skyfire, you are a Dragon Master."

The cheering echoed through the whole academy. And far above, in the evening sky, a great violet dragon slowly spread her wings, and the first star of the night began to shine.`,
      qs:[['What did Master Oona say the Trial is really about?',['Who you are, not what you have done','How fast you can fly','How many bosses you defeated','How strong your dragon is'],0],['What did the Mirror Wyrm try to make Wren believe?',['That she was only a frightened girl pretending to be brave','That Pebble was the real hero','That Master Oona was lying','That she should leave the academy right away'],0],['What did Wren notice when she looked at the mirrors more carefully?',['Each mistake was followed by her learning, apologizing, or trying again','The mirrors were broken','The reflections were of someone else','The mirrors showed the future'],0],['Why did Wren touch the Mirror Wyrm instead of fighting it?',['She accepted her fears as part of herself instead of being ashamed of them','She wanted to break it','She was too tired to fight','Pebble told her to'],0],['What is the main lesson of the final trial?',['Understanding and accepting your fears makes you stronger','Fears should be hidden','Only fearless people succeed','Mirrors are dangerous'],0]] } }
});
