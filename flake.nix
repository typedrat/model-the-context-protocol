{
  description = "Description for the project";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-parts.url = "github:hercules-ci/flake-parts";

    bun2nix = {
      url = "github:baileyluTCD/bun2nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    devshell = {
      url = "github:numtide/devshell";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    flake-root.url = "github:srid/flake-root";

    treefmt-nix = {
      url = "github:numtide/treefmt-nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = inputs @ {flake-parts, ...}:
    flake-parts.lib.mkFlake {inherit inputs;} {
      imports = [
        inputs.devshell.flakeModule
        inputs.flake-root.flakeModule
        inputs.treefmt-nix.flakeModule
      ];

      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
        "x86_64-darwin"
      ];

      perSystem = {
        config,
        inputs',
        pkgs,
        lib,
        system,
        ...
      }: {
        treefmt.config = {
          inherit (config.flake-root) projectRootFile;
          package = pkgs.treefmt;

          programs = {
            # Nix
            alejandra.enable = true;
            deadnix.enable = true;
            statix.enable = true;
          };

          settings = {
            formatter = {
              eslint = {
                command = lib.getExe' pkgs.eslint "eslint";
                options = [
                  "--fix"
                  "--quiet"
                ];
                includes = [
                  "*.md"
                  "*.js"
                  "*.mjs"
                  "*.cjs"
                  "*.jsx"
                  "*.mjsx"
                  "*.ts"
                  "*.tsx"
                  "*.mtsx"
                ];
                excludes = [];
              };
            };
          };
        };

        devshells.default = {
          packages = with pkgs; [
            bun
            inputs'.bun2nix.packages.default
          ];
        };

        packages = rec {
          default = model-the-context-protocol;
          model-the-context-protocol = pkgs.callPackage ./default.nix {
            inherit (inputs.bun2nix.lib.${system}) mkBunDerivation;
          };
        };

        formatter = config.treefmt.build.wrapper;
      };
    };
}
