{
  lib,
  mkBunDerivation,
  ...
}: let
  packageJson = lib.importJSON ./package.json;
in
  mkBunDerivation {
    pname = packageJson.name;
    inherit (packageJson) version;
    src = ./.;
    bunNix = ./bun.nix;
    index = packageJson.module;
  }
