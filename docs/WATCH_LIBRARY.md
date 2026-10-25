# The Watch library (Watch → Courses)

Free courses and teaching from YouTube channels the church trusts, arranged
the way BiblicalTraining.org arranges its classes:

- **by level:** Start here, Grow, Go deeper;
- **by subject:** The Bible, What Christians believe, Following Jesus,
  Prayer, Church history, Big questions, and Children and families.

Each course page lists its lessons in order. It also keeps each person's
place, ticks off the lessons they finish, and gives them a notes box. Progress
and notes sync to their account when they're signed in.

## What staff do (Admin → Watch library)

- **Add a course:** paste either a YouTube playlist link or a list of videos
  (one per line, optionally `link | title`). Then choose the subject and level,
  and write a line about who it's for.
- **Edit, reorder, feature, hide or delete** courses.
- **Add "Latest from" channels:** paste a channel link (for example
  `https://www.youtube.com/@bibleproject`). The newest videos appear as a
  shelf on the Courses page.
- **Check YouTube for updates now:** the app also checks by itself every few
  days.

**The starter list is a suggestion.** The playlists were found on the makers'
YouTube channels in October 2026. Before launch, watch a little of each
course, and hide or delete anything that isn't right for Clearspring. If
YouTube says a playlist no longer exists, the course is hidden automatically
and marked in Admin.

## Full lesson lists: a free YouTube key (recommended)

Without a key, YouTube's public feed only lists a playlist's first 15
lessons. The player still plays all of them, and the app picks up the titles
of later lessons as each person reaches them.

With a key, the app lists every lesson and shows how long each one is.

1. Go to console.cloud.google.com and create a project (for example
   "Clearspring app").
2. Go to **APIs & Services → Library**, search for **YouTube Data API v3**,
   and click **Enable**.
3. Go to **APIs & Services → Credentials → Create credentials → API key**.
   Then click the new key and set:
   - **API restrictions:** YouTube Data API v3 only.
   - **Application restrictions:** None. The server makes the calls, so
     website restrictions won't work.
4. On Render, add an environment variable called `YOUTUBE_API_KEY` with the
   key as its value. Then redeploy.
5. In Admin → Watch library, press **Check YouTube for updates now**.

The free quota is 10,000 units a day. Refreshing the whole library uses
about 20.

## Privacy

Videos play in YouTube's privacy-enhanced player (youtube-nocookie.com).
Nothing loads from YouTube until someone presses play. The app talks to the
player directly and never loads YouTube's own script. Thumbnails come from
i.ytimg.com. Progress and notes are kept on the device, and in the person's
own account when they're signed in.
