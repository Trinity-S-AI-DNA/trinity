One model is loaded here: craft_speederA.glb, the body of every live bee.

The cells carry no 3D models. On 2026-09-06 the operator asked for the 3D
objects to go ("remove the 3D objects, they are too noisy"; "the castles do not
look good, but cells, honey and bees read well"). Every fact is a cell - its
rim, its cap, its colour - so the Kenney Hexagon Kit (24 GLB, CC0) was removed
along with the Space Kit before it (#949, #960).

On 2026-10-08 the owner asked for the bees to be spaceships flying over the
issue each one works on. The ship is one file from the same Space Kit the field
was first built from (#912):

  file     craft_speederA.glb (20,496 bytes,
           sha256 dc48652fa5c59088a5e3902abce7598199f32e0dcb8c91bac25e17bb8ce15876)
  source   "Models/GLTF format/craft_speederA.glb" in kenney_space-kit.zip
           (Space Kit 2.0, 6,677,531 bytes), from https://kenney.nl/assets/space-kit
  licence  CC0 1.0, LICENSE-kenney-space-kit.txt beside it (the kit's
           License.txt, line endings normalised)

src/components/queenShipModel.ts reads it once per page and every bee is a thin
instance of it: twenty ships are one draw call.
