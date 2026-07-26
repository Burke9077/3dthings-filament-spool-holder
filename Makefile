OPENSCAD ?= openscad
SCAD := filament_spool_holder.scad
BUILD_DIR := build
PARTS := side_frame crossbar axle axle_cap link_clip nut_fit_test
STLS := $(addprefix $(BUILD_DIR)/,$(addsuffix .stl,$(PARTS)))

.PHONY: all stls preview check clean

all: stls preview

stls: $(STLS)

$(BUILD_DIR):
	mkdir -p $@

$(BUILD_DIR)/%.stl: $(SCAD) | $(BUILD_DIR)
	$(OPENSCAD) --hardwarnings --check-parameters=true \
		-o $@ -D 'part="$*"' $<

docs:
	mkdir -p $@

docs/assembly.png: $(SCAD) | docs
	QT_QPA_PLATFORM=offscreen $(OPENSCAD) --hardwarnings \
		--imgsize=1400,1050 --projection=perspective --viewall \
		--colorscheme=Tomorrow --render \
		-o $@ -D 'part="assembly"' $<

docs/linked-assembly.png: $(SCAD) | docs
	QT_QPA_PLATFORM=offscreen $(OPENSCAD) --hardwarnings \
		--imgsize=1600,1000 --projection=perspective --viewall \
		--colorscheme=Tomorrow --render \
		-o $@ -D 'part="linked_assembly"' $<

preview: docs/assembly.png docs/linked-assembly.png

check: stls
	@for file in $(STLS); do \
		test -s "$$file"; \
	done

clean:
	rm -rf -- $(BUILD_DIR)
