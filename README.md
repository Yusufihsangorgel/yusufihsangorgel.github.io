# yusufihsangorgel.github.io

Personal engineering notes published with GitHub Pages.

## Medium mirror

The complete public Medium archive can be synchronized without third-party
services. The bounded RSS feed supplies current posts; the script also retains
canonical records for the earliest posts that have aged out of that feed:

```bash
node tool/sync_medium_posts.mjs
node tool/sync_medium_posts.mjs --refresh
node tool/sync_medium_posts.mjs --check
```

The script preserves Medium as a visible publication link while keeping a
complete, readable copy in this static archive.
