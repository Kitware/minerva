$(function () {
    'use strict';
    var cases = {}, deaths = {}, reports = [],
        countries = ['guinea', 'liberia', 'nigeria', 'sierraleone', 'senegal', 'us', 'spain'],
        displayCountry = {
            guinea: 'Guinea',
            liberia: 'Liberia',
            nigeria: 'Nigeria',
            sierraleone: 'Sierra Leone',
            senegal: 'Senegal',
            us: 'United States',
            spain: 'Spain'
        };

    Date.prototype.addDays = function (days) {
        var dat = new Date(this.valueOf());
        dat.setDate(dat.getDate() + days);
        return dat;
    }

    function buildTree(options) {
        var tree = {
                infectedTime: 4.5 * 15,
                symptomTime: 4.5 * 15,
                root: true,
                children: []
            },
            queue = [],
            i,
            childObject,
            infectedTime;
        for (i = 0; i < options.startCount; i += 1) {
            infectedTime = tree.symptomTime + options.transmissionTime();
            childObject = {
                infectedTime: infectedTime,
                symptomTime: infectedTime + options.symptomTime(),
                death: options.death()
            };
            tree.children.push(childObject);
            queue.push(childObject);
        }
        function processCase() {
            var person = queue.shift(), child;
            person.children = [];
            for (child = 0; child < options.transmissions(person.infectedTime); child += 1) {
                infectedTime = person.symptomTime + options.transmissionTime();
                childObject = {
                    infectedTime: infectedTime,
                    symptomTime: infectedTime + options.symptomTime(),
                    death: options.death()
                };
                if (childObject.infectedTime <= options.maxTime) {
                    person.children.push(childObject);
                    queue.push(childObject);
                }
            }
        }
        while (queue.length > 0) {
            processCase();
        }
        return tree;
    }

    function fitTree(options) {
        var generations = [];
        options.data.forEach(function (d) {
            var generation = [], i, infectedTime;
            for (i = 0; i < d.curCount; i += 1) {
                infectedTime = d.time + Math.random() * 15 - 15;
                generation.push({
                    children: [],
                    symptomTime: infectedTime,
                    infectedTime: infectedTime,
                    death: options.death()
                });
            }
            generations.push(generation);
        });
        generations.forEach(function (gen, i) {
            if (i === 0) {
                return;
            }
            gen.forEach(function (person) {
                var parentIndex = Math.floor(Math.random() * generations[i - 1].length),
                    parent = generations[i - 1][parentIndex];
                if (parent) {
                    parent.children.push(person);
                } else {
                    // Go back another generation
                    parentIndex = Math.floor(Math.random() * generations[i - 3].length),
                    parent = generations[i - 3][parentIndex];
                    if (parent) {
                        parent.children.push(person);
                    }
                }
            });
        });
        return generations[0][0];
    }

    function fitTreeByCountry(options) {
        var generations = [], generationsByCountry = [];
        options.data.forEach(function (d) {
            var generation = [], i, infectedTime, generationByCountry = {};
            countries.forEach(function (country) {
                generationByCountry[country] = [];
                for (i = 0; i < d[country]; i += 1) {
                    infectedTime = d.time + Math.random() * 15 - 15;
                    generation.push({
                        children: [],
                        symptomTime: infectedTime,
                        infectedTime: infectedTime,
                        death: options.death(),
                        country: country,
                        visible: ['us', 'senegal', 'spain', 'nigeria'].indexOf(country) !== -1
                    });
                    generationByCountry[country].push(generation[generation.length - 1]);
                }
            });
            generations.push(generation);
            generationsByCountry.push(generationByCountry);
        });
        generations.forEach(function (gen, i) {
            if (i === 0) {
                return;
            }
            gen.forEach(function (person) {
                var parentIndex = Math.floor(Math.random() * generationsByCountry[i - 1][person.country].length),
                    parent = generationsByCountry[i - 1][person.country][parentIndex];
                if (parent) {
                    parent.children.push(person);
                } else {
                    parentIndex = Math.floor(Math.random() * generations[i - 2].length),
                    parent = generations[i - 2][parentIndex];
                    if (parent) {
                        parent.children.push(person);
                    }
                }
            });
        });
        // console.log(generations);
        return generations[0][0];
    }

    function fitTreeByCountryAdaptive(options) {
        var generations = [], generationsByCountry = [];
        options.data.forEach(function (d) {
            var generation = [], i, infectedTime, generationByCountry = {};
            countries.forEach(function (country) {
                var size = Math.ceil(d[country] / 50);
                generationByCountry[country] = [];
                for (i = 0; i < d[country]; i += size) {
                    infectedTime = d.time + Math.random() * 15 - 15;
                    generation.push({
                        children: [],
                        symptomTime: infectedTime,
                        infectedTime: infectedTime,
                        death: options.death(),
                        country: country,
                        size: size
                    });
                    generationByCountry[country].push(generation[generation.length - 1]);
                }
            });
            generations.push(generation);
            generationsByCountry.push(generationByCountry);
        });
        generations.forEach(function (gen, i) {
            if (i === 0) {
                return;
            }
            gen.forEach(function (person) {
                var parentIndex = Math.floor(Math.random() * generationsByCountry[i - 1][person.country].length),
                    parent = generationsByCountry[i - 1][person.country][parentIndex];
                if (parent) {
                    parent.children.push(person);
                } else {
                    parentIndex = Math.floor(Math.random() * generations[i - 2].length),
                    parent = generations[i - 2][parentIndex];
                    if (parent) {
                        parent.children.push(person);
                    }
                }
            });
        });
        // console.log(generations);
        return generations[0][0];
    }

    function poisson(lambda) {
        var n = 0,
            limit = Math.exp(-lambda),
            x = Math.random();
        while (x > limit) {
            n++;
            x *= Math.random();;
        }
        return n;
    }

    function binary(mean) {
        var lower = Math.floor(mean), frac = mean - lower;
        return Math.random() < frac ? lower + 1 : lower;
    }

    function drawChart() {
        var duration = 360,
            root,
            count,
            width = 1100,
            height = 600,
            maxTime,
            cluster,
            diagonal,
            svg,
            nodes,
            timeScale,
            links,
            link,
            node,
            surviveCount,
            deathCount,
            totalCount,
            countScale,
            countAxis,
            dateScale,
            dateAxis,
            dateAxisBottom,
            modelCounts,
            currentMode = 'tree',
            currentCountries = ['all'],
            startDate = new Date(2014, 2, 25).addDays(-15 * 5),
            timeRange,
            countryColor,
            countryColorFunction,
            countryPositionFunction,
            report,
            reportText,
            news,
            time,
            newsHeading = 'News articles provided by HealthMap. Hover to see the article summary.',
            newsHeight = 120,
            i;

        news = d3.select('.news').append('svg')
            .attr('width', width)
            .attr('height', newsHeight)
            .append('g')
            .attr('transform', 'translate(60,20)');

        time = d3.select('.time').append('svg')
            .attr('width', width)
            .attr('height', 25)
            .append('g')
            .attr('transform', 'translate(60,20)');

        svg = d3.select('.main').append('svg')
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .attr('transform', 'translate(60,20)');

        cluster = d3.layout.tree()
            .size([height - 40, width - 80]);

        // // IDEA model
        // modelCounts = [];
        // for (i = 0; i * 15 < duration; i += 1) {
        //     var curCount = Math.pow(1.78 / Math.pow(1 + 0.009, i), i),
        //         prevCount = i > 0 ? modelCounts[i - 1].count : 0;
        //     modelCounts.push({time: i * 15, curCount: curCount, count: prevCount + curCount});
        // }

        // By country count
        modelCounts = [];
        for (i = 0; i * 15 < duration; i += 1) {
            var model = {time: i * 15, count: 0};
            countries.forEach(function (country) {
                var curCount = Math.floor(cases[country](15 * (i - 5))),
                    prevCount = Math.floor(cases[country](15 * (i - 6)));
                // console.log(curCount);
                model[country] = curCount - prevCount;
                model.count += curCount;
            });
            modelCounts.push(model);
        }

        // root = buildTree({
        //     startCount: 21,
        //     maxTime: duration,
        //     transmissions: function (t) {
        //         var r = 1.78 / Math.pow(1 + 0.009, 2 * (t / 15) + 1);
        //         // return poisson(r);
        //         return binary(r);
        //     },
        //     symptomTime: function () {
        //         // return 13;
        //         return 13 + (Math.random() - 0.5) * 5;
        //     },
        //     transmissionTime: function () {
        //         // return 2;
        //         return 1 + Math.random() * 2;
        //     },
        //     death: function () {
        //         return Math.random() < 0.7 ? true : false;
        //     }
        // });

        root = fitTreeByCountryAdaptive({
            data: modelCounts,
            death: function () {
                return Math.random() < 0.7 ? true : false;
            }
        });
        console.log(modelCounts);

        nodes = cluster.nodes(root);
        nodes.sort(function (a, b) { return d3.ascending(a.infectedTime, b.infectedTime); });

        count = {
            survive: 0,
            death: 0,
            total: 0,
            maxCountry: 0
        };

        countries.forEach(function (country) {
            count[country] = {
                survive: 0,
                death: 0,
                total: 0
            }
        });

        nodes.forEach(function (d) {
            var surviveName = d.death ? 'death' : 'survive';
            count.total += d.size;
            d.index = count.total;
            count[d.country].total += d.size;
            if (count[d.country].total > count.maxCountry) {
                count.maxCountry = count[d.country].total;
            }
            d.countryIndex = count[d.country].total;
            count[surviveName] += d.size;
            d.surviveIndex = count[surviveName];
            count[d.country][surviveName] += d.size;
            d.countrySurviveIndex = count[d.country][surviveName];
        });
        count.maxSurvive = Math.max(count.survive, count.death);

        // maxTime = d3.max(nodes, function (d) { return d.infectedTime; });
        maxTime = 295;

        timeScale = d3.scale.linear().domain([-15, maxTime]).range([0, width - 80]);
        links = cluster.links(nodes);
        countScale = d3.scale.linear().domain([0, count.total]).range([height - 40, 0]);
        countAxis = d3.svg.axis().orient('left').scale(countScale);
        dateScale = d3.time.scale().domain([startDate.addDays(-15), startDate.addDays(Math.ceil(maxTime))]).range([0, width - 80]);
        dateAxis = d3.svg.axis().orient('top').scale(dateScale);
        dateAxisBottom = d3.svg.axis().orient('bottom').scale(dateScale);
        countryColor = d3.scale.category10();

        countries.forEach(function (country) {
            countryColor(country);
        });

        countryColorFunction = function (country) {
            if (country !== null) {
                country = country.toLowerCase().replace(/\s/g, '');
                if (country === 'unitedstates') {
                    return countryColor('us');
                }
                if (countries.indexOf(country) !== -1) {
                    return countryColor(country);
                }
            }
            return '#888';
        };

        countryPositionFunction = function (country) {
            if (country !== null) {
                country = country.toLowerCase().replace(/\s/g, '');
                if (country === 'unitedstates') {
                    country = 'us';
                }
                if (countries.indexOf(country) !== -1) {
                    return countries.indexOf(country) / countries.length;
                }
            }
            return 1;
        };

        diagonal = function (obj) {
            var l = d3.svg.line().interpolate('step-before')
                        .y(function (d) { return d.x; })
                        .x(function (d) { return timeScale(d.infectedTime); });
            return l([obj.source, {x: obj.source.x, infectedTime: obj.source.symptomTime}, obj.target]);
        };

        svg.append('g')
            .attr('class', 'axis axis-count')
            .style('opacity', 0)
            .call(countAxis);

        time.append('g')
            .attr('class', 'axis axis-date')
            .attr('transform', 'translate(0,0)')
            .call(dateAxis);

        svg.append('g')
            .attr('class', 'axis axis-date-bottom')
            .attr('transform', 'translate(0,' + (height - 40) + ')')
            .call(dateAxisBottom);

        reportText = news.append('a')
            .attr('xlink:href', 'http://healthmap.org')
            .attr('target', '_blank')
            .append('text')
            .attr('transform', 'translate(10,-10)')
            .style('pointer-events', 'none')
            .html(newsHeading);

        report = news.selectAll('.report')
            .data(reports)
            .enter().append('circle')
            .style('cursor', 'pointer')
            .attr('class', 'report')
            .attr('r', 5)
            .attr('cx', function (d) { return dateScale(new Date(d.date)); })
            .attr('cy', function (d) { return 10 + (newsHeight - 40) * countryPositionFunction(d.country); })
            .attr('fill', function (d) { return countryColorFunction(d.country); })
            .attr('stroke', 'white')
            .attr('stroke-width', 1)
            .style('opacity', 1)
            .on('click', function (d) {
                window.open(d.link, '_blank');
            });

        link = svg.selectAll('.link')
            .data(links)
            .enter().append('path')
            .attr('class', 'link')
            .style('opacity', 0)
            .attr('d', diagonal);

        node = svg.selectAll('.node')
            .data(nodes)
            .enter().append('g')
            .attr('class', 'node')
            .style('opacity', 0)
            .attr('transform', function (d) {
                var y;
                if (currentMode === 'tree') {
                    y = d.x;
                } else if (currentMode === 'total') {
                    y = countScale(d.index);
                } else if (currentMode === 'survive') {
                    y = countScale(d.surviveIndex);
                } else if (currentMode === 'country') {
                    y = countScale(d.countryIndex);
                }
                return 'translate(' + timeScale(d.infectedTime) + ',' + d.x + ')scale(1)';
            });

        node.append('path')
            .attr('transform', 'translate(-9,-9)')
            .attr('d', 'M9 8c1.66 0 2.99-1.34 2.99-3s-1.33-3-2.99-3c-1.66 0-3 1.34-3 3s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5v2.5h14v-2.5c0-2.33-4.67-3.5-7-3.5z')
            // .style('fill', function (d) { return d.death ? 'red' : 'black'; })
            .style('fill', function (d) { return countryColor(d.country); })
            .style('stroke', 'white')
            .style('stroke-width', 0.5)
            .style('opacity', 1);

        // node.append('rect')
        //     .attr('opacity', 1)
        //     .attr('class', 'popover')
        //     .attr('width', 1)
        //     .attr('height', 1);

        // Draw IDEA model
        // svg.selectAll('.model')
        //     .data(modelCounts)
        //     .enter().append('circle')
        //     .attr('class', 'model')
        //     .attr('fill', 'green')
        //     .attr('cx', function (d) { return timeScale(d.time); })
        //     .attr('cy', function (d) { return countScale(d.count); })
        //     .attr('r', 5);

        // node.append('rect')
        //     .attr('height', 1)
        //     .attr('width', 1);

        // node.append('circle')
        //       .attr('r', 4.5);

        function updatePlot() {
            var linkTransition, maxCount;

            dateScale.domain([startDate.addDays(timeRange[0]), startDate.addDays(timeRange[1])]);
            timeScale.domain(timeRange)
            d3.select('.axis-date')
                .transition().duration(1000)
                .call(dateAxis);
            d3.select('.axis-date-bottom')
                .transition().duration(1000)
                .call(dateAxisBottom);

            maxCount = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            nodes.forEach(function (d) {
                if (d.infectedTime >= timeRange[0] && d.infectedTime <= timeRange[1]) {
                    if (currentMode === 'total') {
                        maxCount[0] = Math.max(maxCount[countries.length], d.index);
                    } else if (currentMode === 'survive') {
                        maxCount[d.death ? 0 : 1] = Math.max(maxCount[d.death ? 0 : 1], d.surviveIndex);
                    } else if (currentMode === 'country' && (currentCountries.indexOf('all') !== -1 || currentCountries.indexOf(d.country) !== -1)) {
                        maxCount[countries.indexOf(d.country)] = Math.max(maxCount[countries.indexOf(d.country)], d.countryIndex);
                    }
                }
            });
            maxCount = d3.max(maxCount);
            countScale.domain([0, maxCount]);

            d3.select('.axis-count')
                .transition().duration(1000)
                .style('opacity', currentMode === 'tree' ? 0 : 1)
                .call(countAxis);

            linkTransition = link
                .transition().duration(1000)
                .style('opacity', currentMode === 'tree' ? 1 : 0);

            if (currentMode === 'tree') {
                linkTransition.attr('d', diagonal);
                // link.attr('d', diagonal);
            }

            report
                .transition().duration(1000)
                .attr('cx', function (d) { return dateScale(d.date); });

            report
                .on('mouseover', function (d) {
                    // report.sort(function (a, b) { return (a === d) ? 1 : (b === d) ? -1 : d3.ascending(a.index, b.index); });
                    d3.select(this).transition().duration(200).attr('r', 10);
                    reportText.html(d.country + ' &bull; ' + d.formatted_date + ' &bull; ' + d.summary + ' (Click to read article)');

                    // var text = news.append('text')
                    //     .attr('transform', 'translate(10,-10)')
                    //     .style('pointer-events', 'none')
                    // text.append('tspan')
                    //     .attr('x', 0)
                    //     .html();
                    // text.append('tspan')
                    //     .attr('dy', 20)
                    //     .attr('x', 0)
                })
                .on('mouseout', function (d) {
                    d3.select(this).transition().duration(200).attr('r', 5);
                    reportText.html(newsHeading);
                    // news.selectAll('text').remove();
                    // news.selectAll('rect').remove();
                });

            node
                .transition().duration(1000)
                .style('opacity', function (d) { return currentCountries.indexOf('all') !== -1 ? 1 : currentCountries.indexOf(d.country) !== -1 ? 1 : 0; })
                .style('pointer-events', function (d) { return currentCountries.indexOf('all') !== -1 ? 'auto' : currentCountries.indexOf(d.country) !== -1 ? 'auto' : 'none'; })
                .attr('transform', function (d) {
                    var size = currentMode === 'tree' ? Math.log(d.size + 1) / 2 + 0.75 : 1,
                        y;
                    d.screenSize = size;
                    if (currentMode === 'tree') {
                        y = d.x;
                    } else if (currentMode === 'total') {
                        y = countScale(d.index);
                    } else if (currentMode === 'survive') {
                        y = countScale(d.surviveIndex);
                    } else if (currentMode === 'country') {
                        y = countScale(d.countryIndex);
                    }
                    d.actualY = y;
                    return 'translate(' + timeScale(d.infectedTime) + ',' + y + ')scale(' + size + ')';
                });

            node
                .on('mouseover', function (d) {
                    node.sort(function (a, b) { return (a === d) ? 1 : (b === d) ? -1 : d3.ascending(a.index, b.index); });
                    d3.select(this).transition().duration(200).attr('transform', 'translate(' + timeScale(d.infectedTime) + ',' + d.actualY + ')scale(' + d.screenSize * 2 + ')');
                    d3.select(this).append('rect')
                        .attr('x', -20 / d.screenSize)
                        .attr('y', 8)
                        .attr('rx', 5 / d.screenSize)
                        .attr('ry', 5 / d.screenSize)
                        .attr('width', 40 / d.screenSize)
                        .attr('height', 17 / d.screenSize)
                        .attr('opacity', 0.8)
                        .attr('fill', 'white')
                        .style('pointer-events', 'none');

                    var text = d3.select(this).append('text')
                        .attr('transform', 'translate(0,9)scale(' + 1 / (d.screenSize * 2) + ')translate(0,9)')
                        .style('pointer-events', 'none')
                        .style('text-anchor', 'middle')
                    text.append('tspan')
                        .attr('x', 0)
                        .text(displayCountry[d.country]);
                    text.append('tspan')
                        .attr('dy', 12)
                        .attr('x', 0)
                        .text(d.size + ' case' + (d.size === 1 ? '' : 's'));
                })
                .on('mouseout', function (d) {
                    d3.select(this).transition().duration(200).attr('transform', 'translate(' + timeScale(d.infectedTime) + ',' + d.actualY + ')scale(' + d.screenSize + ')');
                    d3.select(this).selectAll('text').remove();
                    d3.select(this).selectAll('rect').remove();
                });
        }

        timeRange = [-15, Math.ceil(maxTime)];
        updatePlot();

        $('#tree').change(function () {
            currentMode = 'tree';
            $('#countries').show();
            updatePlot();
        });

        $('#total').change(function () {
            currentMode = 'total';

            // Force selection of all countries when showing total counts.
            $('#countries').find('input').removeAttr('checked')
            $('#countries').find('input').parent('.btn').removeClass('active');
            $('#show-all').attr('checked', 'checked');
            $('#show-all').parent('.btn').addClass('active');
            currentCountries = ['all'];

            $('#countries').hide();

            updatePlot();
        });

        $('#survive').change(function () {
            currentMode = 'survive';
            updatePlot();
        });

        $('#country').change(function () {
            currentMode = 'country';
            $('#countries').show();
            updatePlot();
        });

        $('#show-all').change(function () {
            currentCountries = ['all'];
            updatePlot();
        });

        countries.forEach(function (country) {
            $('#show-' + country)
                .change(function () {
                    currentCountries = [country];
                    updatePlot();
                });
            d3.select('#show-' + country).select(function () { return this.parentNode; })
                .style('color', countryColor(country));
        });

        $('#date-all').change(function () {
            timeRange = [-15, Math.ceil(maxTime)];
            updatePlot();
        });

        $('#date-early').change(function () {
            timeRange = [-15, 15 * 5];
            updatePlot();
        });

        $('#date-middle').change(function () {
            timeRange = [15 * 5, 15 * 12];
            updatePlot();
        });

        $('#date-recent').change(function () {
            timeRange = [15 * 12, Math.ceil(maxTime)];
            updatePlot();
        });

        $('#main-carousel').on('slide.bs.carousel', function (e) {
            var target = $(e.relatedTarget).attr('id');
            console.log(target);
            $('#main-carousel').carousel('pause');
            $('input').removeAttr('checked')
            $('input').parent('.btn').removeClass('active');

            function check(ids) {
                ids.forEach(function (id) {
                    $('#' + id).attr('checked', 'checked').change();
                });
            }

            if (target === 'slide-overview') {
                check(['date-all', 'show-all', 'tree']);
            } else if (target === 'slide-origin') {
                check(['date-early', 'show-all', 'tree']);
            } else if (target === 'slide-middle') {
                check(['date-middle', 'show-all', 'tree']);
            } else if (target === 'slide-middle-counts') {
                check(['date-middle', 'show-all', 'total']);
            } else if (target === 'slide-recent') {
                check(['date-recent', 'show-all', 'tree']);
            } else if (target === 'slide-recent-counts') {
                check(['date-recent', 'show-all', 'country']);
            } else if (target === 'slide-travel') {
                check(['date-recent', 'tree']);
                currentCountries = ['us', 'senegal', 'spain'];
                updatePlot();
            }

            $('input[checked="checked"]').parent('.btn').addClass('active');
        });

        $('.info').click(function () {
            if ($('#main-carousel').hasClass('hidden')) {
                $('#main-carousel').removeClass('hidden');
            } else {
                $('#main-carousel').addClass('hidden');
            }
        });
    }

    // d3.csv('countries.csv', function (data) {
    //     data.reverse();
    //     function buildScale(field) {
    //         var domain = [], range = [];
    //         domain.push(-1000);
    //         range.push(0);
    //         data.forEach(function (d) {
    //             if (d[field] !== undefined && d[field] !== '') {
    //                 domain.push(+d.Day);
    //                 range.push(+d[field]);
    //             }
    //         });
    //         domain.push(1000);
    //         range.push(range[range.length - 1]);
    //         // console.log(domain);
    //         // console.log(range);
    //         return d3.scale.linear().domain(domain).range(range);
    //     }
    //     cases.senegal = buildScale('Cases_Senegal');
    //     deaths.senegal = buildScale('Deaths_Senegal');
    //     cases.guinea = buildScale('Cases_Guinea');
    //     deaths.guinea = buildScale('Deaths_Guinea');
    //     cases.us = buildScale('Cases_UnitedStates');
    //     deaths.us = buildScale('Deaths_UnitedStates');
    //     cases.liberia = buildScale('Cases_Liberia');
    //     deaths.liberia = buildScale('Deaths_Liberia');
    //     cases.nigeria = buildScale('Cases_Nigeria');
    //     deaths.nigeria = buildScale('Deaths_Nigeria');
    //     cases.sierraleone = buildScale('Cases_SierraLeone');
    //     deaths.sierraleone = buildScale('Deaths_SierraLeone');
    //     cases.spain = buildScale('Cases_Spain');
    //     deaths.spain = buildScale('Deaths_Spain');
    //     drawChart();
    // });

    d3.csv('data.csv', function (data) {
        function buildScale(field) {
            var domain = [], range = [];
            domain.push(-1000);
            range.push(0);
            data.forEach(function (d) {
                domain.push(+d.Day);
                range.push(+d[field]);
            });
            domain.push(1000);
            range.push(range[range.length - 1]);
            // console.log(domain);
            // console.log(range);
            return d3.scale.linear().domain(domain).range(range);
        }
        cases.senegal = buildScale('SenSus');
        deaths.senegal = buildScale('SenDeath');
        cases.guinea = buildScale('GuinSus');
        deaths.guinea = buildScale('GuinDeath');
        cases.us = buildScale('USSus');
        deaths.us = buildScale('USDeath');
        cases.liberia = buildScale('LibSus');
        deaths.liberia = buildScale('LibDeath');
        cases.nigeria = buildScale('NigSus');
        deaths.nigeria = buildScale('NigDeath');
        cases.sierraleone = buildScale('SLSus');
        deaths.sierraleone = buildScale('SLDeath');
        cases.spain = buildScale('SpainSus');
        deaths.spain = buildScale('SpainDeath');
        d3.json('healthmap-ebola-5rating.json', function (reportData) {
            reports = reportData;
            reports.forEach(function (d, i) {
                d.y = Math.random();
                d.index = i;
            });
            drawChart();
        });
    });

});
