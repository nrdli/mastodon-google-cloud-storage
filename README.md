Mastodon + Google Cloud Storage = ❤️
===================================

With so many instances either relying on S3 or minio, I figured it was high time to throw some diversity into the mix, for a more resilient federation. You should probably read the whole thing before you start, as the process isn't exactly linear.

Requirements
------------

* Until it is officially supported by mastodon, you will need a patched version that supports using `fog` to upload files. [I have such a patch in my fork.](https://github.com/nrdli/mastodon), feel free to use it (at your own risk).
* A google cloud account, with a [CNAME bucket](https://cloud.google.com/storage/docs/xml-api/reference-uris#cname) set up. You can get $300 of credit for a year, and on a smallish node that should last the whole year.
* A cloudflare account set up to forward requests to google cloud storage.

Migrating existing media
------------------------

There are different storage formats in use by paperclip (what mastodon uses for file uploads/storage) for diferent plugins. By setting up the patch (and some environment variable) you will be switching from the built-in filesystem plugin to the fog plugin.

There is a helper script for migrating from FS to GCS in this repo, the gist is that on the filesystem we have:

* `{mastodon}/public/system/media_attachments/files/000/000/001/original/83d9ee7311bffc6f.jpeg`
* `{mastodon}/public/system/media_attachments/files/000/000/001/small/83d9ee7311bffc6f.jpeg`

And when files are stored in google drive they live in:

* `{bucket}/images/media_attachments/1/files/original/img_`
* `{bucket}/images/media_attachments/1/files/small/img_`

You can build that folder structure by:

1. Install node & yarn (which should alredy be done since we are running mastodon).
2. Install our dependencies (`yarn`)
3. Run the script `node move-media ../path/to/live .` (Puts the images directory here).
  You can run the above command with `--dry-run` to see the output of what the command will do if you don't trust the code.

Once that folder has been built you can just use [Google's CLI](https://cloud.google.com/sdk/), `gsutil`, to upload that folder and set the ACL to public. (`gsutil -m cp -r images gs://media.nrd.li && gsutil -m acl ch -r -u AllUsers:R gs://media.nrd.li`)

You probably want to do this step twice, once before you reconfigure your instance, and once again after so that you can be sure all media has been uploaded to cloud storage. I'm sure there's a way to sync the directory, but ingress is free so I just uploaded it all twice.

Setting it up so you can see images
-----------------------------------

By default there are no CORS headers sent, which needs to be rectified.

1. Edit `cors-config.json`, replace `"origin": "*"` with `"origin": "https://my.mastodon"`.
2. Set the policy of the bucket you are using for media `gsutil cors set config.json gs://bucket-name`

You can use `cors-config.json` without editing it, but that is slightly less secure than specifying the origin.
