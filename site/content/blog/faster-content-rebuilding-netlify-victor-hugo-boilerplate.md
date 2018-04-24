+++
categories = ["Technology"]
date = "2018-04-21T00:40:49+00:00"
image = "v1524599514/blog/netlify-victor-hugo-boilerplate"
imageCaption = ""
noDiscuss = false
title = "Faster content rebuilding for Netlify's victor-hugo boilerplate"

+++

<boom>W</boom>hether you're just learning [Hugo](https://gohugo.io/) or bringing your Hugo experience to a new project, there's a good chance you'll be reaching for Netlify's [victor-hugo](https://github.com/netlify/victor-hugo) boilerplate. It's the first [starter kit](https://gohugo.io/tools/starter-kits/) listed in the Hugo documentation and has earned over 750 shiny Github stars :star:.

Here's a summary of what's in the boilerplate:

- [gulp](https://gulpjs.com/) for watching files and running tasks
- [Hugo](https://gohugo.io) for building the content in the `site` directory
- [webpack](https://webpack.js.org/) for building JavaScript in `src/js` to `dist/app.js`
- [PostCSS](http://postcss.org/) for building CSS from `src/css` to `dist/main.css`
- [Browsersync](https://browsersync.io/) for live-reloading the browser in development

The great thing about victor-hugo and boilerplates in general is that you don't have to know exactly what every piece does before you can start using it. To get up and running with victor-hugo, you just need a few commands:

```shell
$ git clone git@github.com:netlify/victor-hugo.git

$ cd victor-hugo

$ npm install

$ npm start
```

Navigate to [http://localhost:3000/](http://localhost:3000) and you'll be greeted by a webpage :tada:

{{< cloudinary src="v1524584290/blog/netlify-victor-hugo-boilerplate-plain" class="image-small" >}}

## Reloading changes

When you make changes to your assets in the `src` folder or your Hugo content in the `site` folder, gulp tasks will rebuild the content and the browser will refresh automatically. For small and medium-size sites this all happens in a few milliseconds, making for a very pleasant developer experience.

Here's how it works under the hood. The `server` gulp task watches for changes in `site/**/*` and then spawns a `hugo` process to build the site, which exits when it's done. Once the gulp task detects that the hugo process exited successfully, it notifies Browsersync to refresh the page. The code is in the `buildSite()` method in `gulpfile.babel.js`:

```javascript
return spawn(hugoBin, args, {stdio: "inherit"}).on("close", (code) => {
  if (code === 0) {
    browserSync.reload();
    cb();
  } else {
    browserSync.notify("Hugo build failed :(");
    cb("Hugo build failed");
  }
});
```

## Speeding up reloads for content

As the amount of content for your static site grows, however, this method might not build changes as fast as you want. Each new hugo process has to read all the content from disk and the time to do that increases as your site grows. For my site of around 90 pages, the rebuilding didn't quite feel instant anymore.

There is an easy way to make this process faster and more efficient. The trick is not to launch a new Hugo process (which does a full rebuild) on every change, but instead to use Hugo's built-in ability to serve & watch files with incremental rebuilds.

Hugo has a `server` subcommand that runs a built-in HTTP server and accepts a `-w` flag that watches for underlying files. As the Hugo docs mention, this has [performance advantages](https://gohugo.io/commands/hugo_server/):

> "**hugo server** will avoid writing the rendered and served content to disk, preferring to store it in memory."

## dzello/victor-hugo

I created a [fork of victor-hugo](https://github.com/dzello/victor-hugo) that adds a gulp task to take advantage of this Hugo feature. The task is called `server-hugo` and it uses the Hugo HTTP server in watch mode, just as if you ran `hugo server -w`.

Here's how the `server-hugo` task looks:

```javascript
// Development server with hugo --watch
gulp.task("server-hugo", ["css", "js", "fonts"], (cb) => {
  browserSync.init({
    proxy: "localhost:3001",
    ui: { port: 3002 }
  });
  gulp.watch("./src/js/**/*.js", ["js"]);
  gulp.watch("./src/css/**/*.css", ["css"]);
  gulp.watch("./src/fonts/**/*", ["fonts"]);
  watchSite(cb);
});
```

Here's the `watchSite` method that it calls:

```javascript
/*
* Run hugo in watch mode
*/
function watchSite(cb, options = {}, environment = "development") {
  const args = ["server"].concat(hugoArgsDefault).concat(options).concat(["-w", "-p", "3001"]);

  process.env.NODE_ENV = environment;

  return spawn(hugoBin, args, {stdio: "inherit"}).on("close", (code) => {
    if (code === 0) {
      cb();
    } else {
      cb("Hugo process exited");
    }
  });
}
```

In order to avoid losing any live-reload functionality from the original `server` task, this task uses Browsersync's proxying feature. Browsersync (on port 3000) sits in front of Hugo (on port 3001) so that it can inject its own instance of [LiveReload](http://livereload.com/) into the page. With this setup, the browser will reload (or apply CSS changes) instantly after both Hugo and and asset rebuilds.

## --disableFastRender

As of 0.3.0, Hugo [speeds up live reloads](https://gohugo.io/news/0.30-relnotes/) by building only the parts of the site that changed. It's a great feature, squarely in the tradition of Hugo's relentless need for speed. However, in my experience it can lead to times where a change to one template or partial doesn't rebuild every page that it's included in.

If you run into that same issue, you can turn off incremental builds by adding a `--disableFastRender` argument to the `hugo server` command. The builds take slightly longer but the upside is that you'll never have to worry about stale content.

To add `--disableFastRender` to the gulp task above, just modify this line like so:

```javascript
const args = ["server"].concat(hugoArgsDefault).concat(["-w", "-p", "3001", "--disableFastRender"]);
```

Happy boilerplating!
