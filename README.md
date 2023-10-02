# Business Card Cutter Templater

This short script can take one or more images of business cards and produce a [business card cutter](https://youtu.be/wGMH5a1iHFk) ready page, to be printed then cut.

It can deal with side / top margins as well as various paper / card sizes.

## Installation

In order to run this piece of code, you will need to install `reportlab`:

```
pip install reportlab
```

## Usage

Modify your parameters (file names, paper size, etc.) at the top of the `templater.py` file then run:

```
python3 templater.py
```

It should produce a pdf with one page per image (see the files in this folder for a demo).

## TODO

Make a version that can deal with several *different* designs per page.
