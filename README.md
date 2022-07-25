# DarkFO

Is Fork with clarification versions of dependencies and minor fixes

## Installation

To use this, you'll need a few things:

- A licensed copy of Fallout 2 (Installed via Steam)

- Python 2.7 (Installed via `sudo apt install python2.7`)

- PIP 20.3.4 (Installed via `wget https://bootstrap.pypa.io/pip/2.7/get-pip.py` and `sudo python2.7 get-pip.py`)

- [Pillow] and [NumPy] (Installed via `pip install -r requirements`)

- NodeJS (Istalled via `npm install -g typescript@v3.0.1`).

- TypeScript compiler v3.0.1 (Istalled via `npm install -g typescript@v3.0.1`).

Open a command prompt inside the DarkFO directory, and then run:

    python2.7 setup.py path/to/Fallout2/installation/directory

Then run `tsc` to compile the source code.

- Also you need any html server (express e.g.) for sharing files in index.html
