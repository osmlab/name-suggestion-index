---
description: Stage, commit, and push all changes in this repo
argument-hint: commit detail to include, for example: `(closes ​#123)`
---

You are performing a git commit for this repo. Do the following steps in order:

1. Run `git status` to see what's modified
2. Run `git add -A` to stage everything (`.gitignore` already excludes transient runtime files)
3. If there is nothing to stage, say so clearly and stop — do not create an empty commit
4. Write a commit message that summarizes the recent work to a temp file, then run `git commit -F <tempfile>` and delete the temp file afterward.
   - Do NOT use `git commit -m` — multi-line messages with special characters break shell quoting.
   - Do NOT use heredoc syntax (`<< 'EOF'`) — it interacts badly with the terminal tool.
   - Instead, use `printf` to write the temp file, one `'line'` argument per line:
     ```
     printf '%s\n' 'First line' '' 'Second line' 'Third line' > /tmp/commitmsg.txt
     git commit -F /tmp/commitmsg.txt
     rm /tmp/commitmsg.txt
     ```
   - If a commit detail argument was provided (e.g. `closes #123`), include it on its own line after the first line (subject), separated by a blank line:
     ```
     printf '%s\n' 'First line' '' 'closes #123' > /tmp/commitmsg.txt
     ```
5. Run `git push` to push commits up to the origin

