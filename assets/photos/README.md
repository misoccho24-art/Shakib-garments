# Drop real photographs here

The site currently shows vector illustrations from `assets/img/`. They are
placeholders. Put a real photo in **this folder** using the exact filename
below and the site switches to it automatically on the next load — no HTML,
CSS or JS to change.

If a file is missing, the illustration is used instead, so you can add them
one at a time.

| Filename | Where it appears | Shape | Suggested size | What to shoot / search for |
|---|---|---|---|---|
| `factory-interior.jpg` | Home hero background | wide 16:9 | 2000×1125 | Wide shot down the aisle of a sewing floor, lights overhead |
| `factory-floor.jpg` | About story, Home "why buyers stay" | 4:3 | 1600×1200 | Rows of operators at sewing machines |
| `finished-goods.jpg` | About, third column | portrait 4:5 | 1200×1500 | Finished garments on a rail before packing |
| `fabric-swatches.jpg` | Services | 4:3 | 1600×1200 | Fabric swatches, lab dips, colour cards |
| `quality-check.jpg` | Home "why buyers stay" | 4:3 | 1600×1200 | Inspector measuring a garment on the QC table |
| `packing-export.jpg` | Home, Contact | 4:3 | 1600×1200 | Cartons stacked and marked, ready for the forwarder |
| `banner-threads.jpg` | Home CTA banner | very wide | 2400×600 | Close macro of yarn, warp threads or knit texture |
| `product-tee.jpg` | Home range | square 1:1 | 1200×1200 | Flat-lay or hanging t-shirt on a plain ground |
| `product-croptop.jpg` | Home range | square 1:1 | 1200×1200 | Crop top, same treatment |
| `product-hoodie.jpg` | Home range | square 1:1 | 1200×1200 | Hoodie, same treatment |
| `product-trousers.jpg` | Home range | square 1:1 | 1200×1200 | Knit trousers or joggers, same treatment |

## Notes

- **Keep the aspect ratio** in the table. The slots crop with `object-fit: cover`,
  so a badly proportioned photo will crop oddly.
- **Compress before adding.** Aim under 300 KB each; the hero background under
  500 KB. Large photos will undo the mobile performance work.
- `.jpg` is what the site looks for. If you prefer `.webp`, rename the lookup in
  the `data-photo` attribute of the relevant `<img>`.
- The four product shots look best photographed the same way — same background,
  same distance, same lighting — so the grid reads as one set.

## Where to get licence-clear photos

Use libraries that allow commercial use without attribution, and check the
licence on each individual photo before shipping:

- Unsplash — <https://unsplash.com/s/photos/garment-factory>
- Pexels — <https://www.pexels.com/search/textile%20factory/>
- Pixabay — <https://pixabay.com/images/search/sewing%20factory/>

Useful search terms: *garment factory*, *sewing floor*, *textile mill*,
*apparel production*, *fabric swatches*, *clothing rail*, *export cartons*.

Best of all is a photographer at your own factory in Savar — the photos will
match the copy, and the licence question disappears.
