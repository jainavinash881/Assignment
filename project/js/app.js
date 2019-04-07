$(function () {
	"user strict";
	checkBrowserCompatible();
	$('.browse_files').on('click', function() {
		$('#input-browse').focus().click();
		return false;
	});

	// Snap.js
	var snapper = new Snap({
    element: document.getElementById('content-wrapper'),
    disable: 'right'
  });
  $('#open-left').on('click', function() {
  	if ($(this).hasClass('active')) {
  		snapper.close();
  	} else{
  		snapper.open('left');	
  	}
  	$(this).toggleClass('active');
  });
  $(window).resize(function() {snapper.close()});

	var uploader = FIVE();
	uploader.init();
})

function FIVE() {
	var destinationAfterUpload = 'uploaded.html';
	var filesToUpload = [];
	var map;

	


	var init = function() {
		var jqXHR, uploadIndex = 0;

		$('#fileupload').fileupload({
			progressInterval : 50,
			bitrateInterval : 250,
			maxFileSize: 10000000, //10MB
			acceptFileTypes: /(\.|\/)(jpe?g)$/i,
			// singleFileUploads: false,//if TRUE (default), "add" will be call multiple times
			sequentialUploads: true,
			maxNumberOfFiles: 10,
			disableImageResize: true,
			imageMaxWidth: 1600,
			imageMaxHeight: 1600,
			uploadTemplateId: null,
			downloadTemplateId: null,
			add: function(e, data){
				var $lstThumb = $('.thumbnails-holder');

				//Read photo at client
				$.each(data.files, function(index, file) {
					canvasResize(file, {
						width: 1140,
						height: 500,
						crop: false,
						quality: 90,
						//rotate: 90,
						callback: function(imageData, width, height, exifData) {
							// - NOT SUPPORT FILE - //
							// Max of 10 files
							if ($('.upload-thumbnail').length >= 10) {
								alert('Exceed max of 10 files. Aborted !');
								return true;
							}

							// Restrict file size
							if (file.size >= 10000000) {// 10MB
								alert('File ' + file.name + ' is larger than 10MB. Aborted !');
								return false;
							}

							// Restrict file type: JPG only
							if (!file.type.match(/(\.|\/)(jpe?g)$/i)) {
								alert('File type is not supported');
								return false;
							}

							// - SUPPORTED FILE - //
							uploadIndex++;// Index for each photo
							var is1stFile = false;
							if ($('.upload-thumbnail').length == 0) {
								is1stFile = true;
								uploadIndex = 1;
							}

							// Extract EXIF data
							var tdata = $.extend({}, exifData, {title: file.name, count: uploadIndex, active: is1stFile});
						

							// render HTML for thumbnail item
							var thumbnailHtml = tmpl("tmpl-uploadThumbnail", {
								index: uploadIndex, 
								filename: file.name, 
								imageSrc: imageData, 
								active: is1stFile,
							
							});
							$lstThumb.append(thumbnailHtml);
							$('img[alt="' + file.name + '"]').resizeToParent({parent: '.upload-thumbnail'});

							// render HTML for edit-zone
							var editZoneHtml = tmpl("tmpl-uploadEditor", tdata);
							data.context = uploadIndex;//KEY POINT, GRRRRRRRR !!!
							$(".edit-zone-holder").append(editZoneHtml);

							if (is1stFile){
								$('.uploader').removeClass('block-hide');// show the edit tool
								$('.start-zone').hide();
								$('.preview-zone img').attr('src', imageData);
								confirmClosePage();
							
							}

							initFormHelper();

							// List of files to upload
							filesToUpload.push(data);
							updateUploadEditor();
						}
					});
				});
			},

			send : function(e, data) {
				jqXHR = data.xhr();
			},

			progress: function(e, data) {
				// var progress = parseInt(data.loaded / data.total * 100, 10);
			},

			progressall: function(e, data) {
				var progress = 0;
				if (data.total){
					progress = parseInt(data.loaded / data.total * 100, 10);
				}
				showProgress(progress);
			},

			submit: function(e, data){
				console.log(data.files[0].name + '<-- uploading...');
				if ($('#photo-' + data.context).length != 0) {//dont send removed photos
					var additionData = $('#photo-' + data.context + ' form').serializeArray();
					data.formData = additionData;
					return true;
				} else {
					return false;
				}
			},

			done : function(e, data) {
				console.log(data.files[0].name + '<-- DONE');
				
				//Store image data into HTML5 localStorage to display right after uploading
				if (window.localStorage){
					var imageData = $('.upload-thumbnail.photo_' + data.context + ' img').attr('src');
					localStorage.setItem('photo500_' + data.files[0].name.substring(0, 20), imageData);
				}
			},

			stop: function(e){
				redirectProgress('Finished.');
				window.onbeforeunload = false;
				window.setTimeout(function(){
					redirectProgress('Redirecting...');
				}, 1000);
				window.setTimeout(function(){
					window.location.href = destinationAfterUpload;
				}, 2000);
			}
		});
		
		/*-- Binding events --*/
		//Cancel (remove) a photo
		$(document).on('click', '.btn-remove', function(e){
			var r = confirm('Are you sure to remove this photo');
			if (r == true) {
				// remove photo thumbnail + editor
				$('.edit-zone.active').remove();
				if ($('.thumbnails-holder .active').prev().length) {
					$('.thumbnails-holder .active').prev().find('a').trigger('click').end().end().remove();
				} else {
					$('.thumbnails-holder .active').next().find('a').trigger('click').end().end().remove();
				}
				updateUploadEditor();

				// If no photo remains, reset start-zone
				if ($('.upload-thumbnail').length == 0){
					$('.start-zone').show();
					$('.uploader').addClass('block-hide');
					is1stFile = true;
					filesToUpload = [];
				}
			}
		});

		$('.btn-upload').on('click', function(e){
			$('.btn-upload').off('click').css({opacity: 0.5, cursor: 'wait'});
			$('html, body').animate({scrollTop: 0}, 1000);
			$('.btn-remove, .btn-save').hide();
			$('.preview-zone img').remove();
			$(document).on('click', '#myTab a', function(e) {
				e.preventDefault();
				e.stopPropagation();
			});
			$('.upload-thumbnail').parent().removeClass('active');
			// $('.edit-zone').removeClass('active');
			$('.map').addClass('disabled');
			$('.edit-zone input, .edit-zone textarea, .edit-zone select').attr('readonly', 'true');

			for (i in filesToUpload){
				filesToUpload[i].submit();
			}
		});

		$(document).on('click', '#myTab a', function (e) {
			e.preventDefault();
			if (!$(this).closest('li').hasClass('active')) {
				$(this).tab('show');
				tabSelect($(this));
			}
		})
	}

	var tabSelect = function(_this) {
		$('.preview-zone img').attr('src', _this.find('img').attr('src'));
		initMap($('.edit-zone.active .map-canvas')[0]);
		initFormHelper();
	}

	
		

		






	var confirmClosePage = function(){
		window.onbeforeunload = function(e){
			var msg = 'Are you sure to leave this page ?';
			e = e || window.event;
			if(e) e.returnValue = msg;
			return msg;
		}
	}

	var updateUploadEditor = function() {
		$('.totalphoto').text($('.upload-thumbnail').length);
		updateReadyPhoto();
	}

	var updateReadyPhoto = function() {
		$('.readyphoto').text($('.upload-thumbnail.ready').length);
	}

	

	var minuteToDegree = function(data) {
		return (data[0] + data[1]/60 + data[2]/3600);
	}

	var dateFormat = function(date, format) {
		// Calculate date parts and replace instances in format string accordingly
		format = format.replace("DD", (date.getDate() < 10 ? '0' : '') + date.getDate()); // Pad with '0' if needed
		format = format.replace("MM", (date.getMonth() < 9 ? '0' : '') + (date.getMonth() + 1)); // Months are zero-based
		format = format.replace("YYYY", date.getFullYear());
		return format;
	}

	var checkReady = function() {
		var isReady = true;
		$('.editPhoto').find('input.photoLat').each(function(index){
			if (!$(this).val()){
				tabSelect(index);
				isReady = false;
				return true;
			}
		});
		return isReady;
	}

	var showProgress = function(rate) {
		var $p = $('.progress-holder');
		if (!$p.is(':visible')) $p.show();
		$p.find('.progress-bar').css('width', rate + '%');
		$p.find('.progress-rate').text(rate + '%');
	}

	var hideProgress = function() {
		$('.progress-holder').hide();
	}

	var redirectProgress = function(text) {
		var $p = $('.progress-holder');
		$p.find('.progress-rate').text(text); 
	}

	

	var initFormHelper = function() {
		$('.edit-zone.active .tagging').select2({
			minimumInputLength: 3,
			maximumSelectionSize: 3,
			placeholder: $(this).attr('placeholder'),
			tags: [],
			tokenSeparators: [","]
			// width: '360px'
		});

		$('.edit-zone.active .datepicker').datepicker({
			format: "yyyy/mm/dd",
			autoclose: true
		});

		$('.edit-zone.active .timepicker').timepicker({
			timeFormat: 'H:i',
			step: 1
		}).on('keypress', function(e){e.preventDefault()});
	}

	var clearClientStorage = function() {
		if (window.localStorage){
			localStorage.clear();
		}
	}

	return {init: init};
}

function isBrowserCompatible() {
		if (!window.File || !window.FileList || !window.FileReader) {
				return false;
		}
		return true;
	}

function checkBrowserCompatible() {
		if (!isBrowserCompatible()){
			// fancyAlert("Please use latest Google Chrome, Mozilla Firefox, Opera to get the best experiences");
			alert('Unsupported browser !');
		}
	}