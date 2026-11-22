---
name: commit
description: Stage and commit all changes in this repo
disable-model-invocation: true
argument-hint: "commit details or instructions, for example: `and push`, `closes #123`"
---

You are performing a git commit for this repo.

If the user passed an argument, it can hold commit details, instructions, or both:
- **Commit details** (e.g. `closes #123`) go in the commit message, as described in step 4.
- **Instructions** (e.g. `and push`, `only the README changes`) are for you to follow. Don't put them in the commit message.

Do the following steps in order:

1. Run `git status` to see what's modified
2. Run `git add -A` to stage everything (`.gitignore` already excludes transient runtime files)
3. If there is nothing to stage, say so clearly and stop — do not create an empty commit
4. Write a commit message that summarizes the recent work to a temp file, then run `git commit -F <tempfile>` and delete the temp file afterward.
   - Do NOT use `git commit -m` — multi-line messages with special characters break shell quoting.
   - Do NOT use heredoc syntax (`<< 'EOF'`) — it interacts badly with some agents' terminal tools.
   - Instead, use `printf` to write the temp file, one `'line'` argument per line:
     ```
     printf '%s\n' 'First line' '' 'Second line' 'Third line' > /tmp/commitmsg.txt
     git commit -F /tmp/commitmsg.txt
     rm -f /tmp/commitmsg.txt
     ```
   - If commit details were provided (e.g. `closes #123`), include them on their own line after the first line (subject), separated by a blank line:
     ```
     printf '%s\n' 'First line' '' 'closes #123' > /tmp/commitmsg.txt
     ```
5. Only push if the user asked to (e.g. `/commit and push`). Otherwise stop after committing, so the user can review or amend the commit first.
