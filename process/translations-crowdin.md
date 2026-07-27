---
id: process-translations-crowdin
title: Crowdin translation workflow
summary: Uploading source strings to Crowdin and getting translations back as a pull request
status: active
applies_to: [plugin, module]
tags: [translations, crowdin, i18n, github-actions]
related: [wp-i18n, process-translations-ai]
order: 60
enforceable: false
---

This document outlines the process for managing translations in our WordPress
plugin and module repositories using Crowdin and GitHub Actions.

## Workflow overview

Our translation process consists of two GitHub Actions workflows:

1. **Crowdin Upload Action**: uploads the latest source file (`.pot` file) to
   Crowdin.
2. **Crowdin Download Action**: downloads translated `.po` files from Crowdin and
   creates a pull request against the selected branch.

After downloading the translations, additional steps are required to generate the
necessary translation files for PHP and JavaScript.

## Steps for managing translations

### 1. Upload source file to Crowdin

If there are untranslated strings, follow these steps to upload the updated
source file to Crowdin:

1. Navigate to the **GitHub repository**.
2. Go to the **Actions** tab.
3. Select **Crowdin Upload Action**.
4. Click **Run workflow** (ensure you are in the correct branch).
5. The workflow will upload the updated `.pot` file to Crowdin.

### 2. Translate in Crowdin

1. Log in to [Crowdin](https://crowdin.com/).
2. Navigate to the respective project.
3. Use **machine translations** or **manual translations** to complete the
   missing translations.
4. Ensure translations are reviewed and approved.

### 3. Download translations from Crowdin

Once translations are completed in Crowdin, follow these steps to download the
translated `.po` files:

1. Navigate to the **GitHub repository**.
2. Go to the **Actions** tab.
3. Select **Crowdin Download Action**.
4. Click **Run workflow**.
5. Specify the **base branch** where you want the PR to be raised (default:
   `main`).
6. The workflow will download translations and create a pull request.

### 4. Verify and generate translation files

After the pull request is created:

1. **Review the translations** in the `.po` files for accuracy and correctness.
2. Once verified, **merge the pull request**.
3. Run the following commands to generate translation files for PHP and JS:

   ```sh
   composer i18n-mo
   composer i18n-php
   composer i18n-json
   ```

4. Commit and push the generated files if necessary.

## Notes

* Ensure that the necessary **Crowdin API credentials** are configured in the
  repository secrets (`CROWDIN_PROJECT_ID` and `CROWDIN_PERSONAL_TOKEN`).
